import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Credit multiplier: 8% of word count (based on Gemini 2.5 Pro API pricing)
const PROOFREADING_CREDIT_MULTIPLIER = 0.08;
const PROOFREADING_MIN_CREDITS = 500;

function calculateProofreadingCredits(wordCount: number): number {
  const calculated = Math.round(wordCount * PROOFREADING_CREDIT_MULTIPLIER);
  return Math.max(calculated, PROOFREADING_MIN_CREDITS);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header missing");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    const { projectId } = await req.json();
    
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    // Use service role client for operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if there's already an active order for this project
    const { data: existingOrder } = await supabaseAdmin
      .from("proofreading_orders")
      .select("id, status")
      .eq("project_id", projectId)
      .in("status", ["pending", "paid", "processing"])
      .single();

    if (existingOrder) {
      throw new Error("A lektorálás már folyamatban van ennél a projektnél");
    }

    // Get project details and verify ownership
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, title, user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    if (project.user_id !== user.id) {
      throw new Error("You don't have permission to access this project");
    }

    // Get total word count from chapters
    const { data: chapters, error: chaptersError } = await supabaseAdmin
      .from("chapters")
      .select("id, word_count")
      .eq("project_id", projectId);

    if (chaptersError) {
      throw new Error("Failed to fetch chapters");
    }

    if (!chapters || chapters.length === 0) {
      throw new Error("A projekt nem tartalmaz fejezeteket");
    }

    const totalWordCount = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
    
    if (totalWordCount < 100) {
      throw new Error("A könyv túl rövid a lektoráláshoz (min. 100 szó)");
    }

    // Calculate credit cost
    const creditsNeeded = calculateProofreadingCredits(totalWordCount);

    // Check user's credit balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("extra_words_balance, monthly_word_limit")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Failed to fetch user profile");
    }

    // Get current month usage
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabaseAdmin
      .from("user_usage")
      .select("words_generated")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .single();

    const monthlyUsed = usage?.words_generated || 0;
    const monthlyRemaining = Math.max(0, profile.monthly_word_limit - monthlyUsed);
    const totalAvailable = monthlyRemaining + profile.extra_words_balance;

    if (totalAvailable < creditsNeeded) {
      throw new Error(`Nincs elég kredit! Szükséges: ${creditsNeeded.toLocaleString()}, elérhető: ${totalAvailable.toLocaleString()}`);
    }

    // Deduct credits - first from monthly, then from extra balance
    let remainingToDeduct = creditsNeeded;
    
    // Deduct from monthly allowance first (increment usage)
    if (monthlyRemaining > 0) {
      const deductFromMonthly = Math.min(remainingToDeduct, monthlyRemaining);
      remainingToDeduct -= deductFromMonthly;
      
      // Update usage
      const { error: usageError } = await supabaseAdmin.rpc('increment_words_generated', {
        p_user_id: user.id,
        p_word_count: deductFromMonthly,
      });

      if (usageError) {
        console.error("Error incrementing usage:", usageError);
      }
    }

    // Deduct remaining from extra credits
    if (remainingToDeduct > 0) {
      const { error: creditError } = await supabaseAdmin.rpc('use_extra_credits', {
        p_user_id: user.id,
        p_word_count: remainingToDeduct,
      });

      if (creditError) {
        console.error("Error deducting extra credits:", creditError);
        throw new Error("Hiba a kreditek levonása során");
      }
    }

    // Create order record (without stripe_session_id)
    const { data: order, error: insertError } = await supabaseAdmin
      .from("proofreading_orders")
      .insert({
        user_id: user.id,
        project_id: projectId,
        stripe_session_id: null, // Now nullable for credit-based purchases
        amount: 0, // No monetary amount for credit purchases
        word_count: totalWordCount,
        total_chapters: chapters.length,
        credits_used: creditsNeeded,
        status: "paid", // Immediately paid since credits are deducted
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create order:", insertError);
      throw new Error("Failed to create order");
    }

    console.log(`[START-PROOFREADING] Order created: ${order.id}, credits: ${creditsNeeded}`);

    // Start proofreading process asynchronously
    const processUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-proofreading`;
    
    fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ orderId: order.id }),
    }).catch((err) => {
      console.error("Failed to trigger proofreading process:", err);
    });

    console.log(`[START-PROOFREADING] Process triggered for order: ${order.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        orderId: order.id,
        creditsUsed: creditsNeeded,
        wordCount: totalWordCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error starting proofreading:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
