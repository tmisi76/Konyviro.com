import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Price per word in HUF (0.1 Ft/word, minimum 1990 Ft)
const PRICE_PER_WORD = 0.1;
const MINIMUM_PRICE = 1990;

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

    // Check if there's already an active order for this project
    const { data: existingOrder } = await supabaseClient
      .from("proofreading_orders")
      .select("id, status")
      .eq("project_id", projectId)
      .in("status", ["pending", "paid", "processing"])
      .single();

    if (existingOrder) {
      throw new Error("A lektorálás már folyamatban van ennél a projektnél");
    }

    // Get project details and calculate word count
    const { data: project, error: projectError } = await supabaseClient
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
    const { data: chapters, error: chaptersError } = await supabaseClient
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

    // Calculate price: word_count * 0.1 Ft, minimum 1990 Ft
    const calculatedPrice = Math.round(totalWordCount * PRICE_PER_WORD);
    const finalPrice = Math.max(calculatedPrice, MINIMUM_PRICE);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create Stripe checkout session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: `AI Lektorálás - ${project.title}`,
              description: `${totalWordCount.toLocaleString("hu-HU")} szó professzionális AI lektorálása`,
            },
            unit_amount: finalPrice * 100, // HUF uses fillér (100 fillér = 1 Ft)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/project/${projectId}?proofreading=success`,
      cancel_url: `${req.headers.get("origin")}/project/${projectId}?proofreading=cancelled`,
      metadata: {
        user_id: user.id,
        project_id: projectId,
        word_count: totalWordCount.toString(),
        type: "proofreading",
      },
    });

    // Create order record with service role client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: insertError } = await supabaseAdmin
      .from("proofreading_orders")
      .insert({
        user_id: user.id,
        project_id: projectId,
        stripe_session_id: session.id,
        amount: finalPrice,
        word_count: totalWordCount,
        total_chapters: chapters.length,
        status: "pending",
      });

    if (insertError) {
      console.error("Failed to create order:", insertError);
      throw new Error("Failed to create order");
    }

    return new Response(
      JSON.stringify({ 
        url: session.url,
        price: finalPrice,
        wordCount: totalWordCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating proofreading purchase:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
