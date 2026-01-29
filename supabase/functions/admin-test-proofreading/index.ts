import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Create client with user's auth token
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
  });

  // Create admin client for privileged operations
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabaseClient
      .from("admin_users")
      .select("role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, title, user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Get chapter count and word count
    const { data: chapters, error: chaptersError } = await supabaseAdmin
      .from("chapters")
      .select("id, word_count")
      .eq("project_id", projectId);

    if (chaptersError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch chapters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const totalChapters = chapters?.length || 0;
    const totalWords = chapters?.reduce((sum, ch) => sum + (ch.word_count || 0), 0) || 0;

    if (totalChapters === 0) {
      return new Response(
        JSON.stringify({ error: "No chapters to proofread" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create test order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("proofreading_orders")
      .insert({
        user_id: project.user_id,
        project_id: projectId,
        stripe_session_id: `test_${Date.now()}_${user.id}`,
        amount: 0,
        word_count: totalWords,
        status: "paid", // Start as paid so process-proofreading picks it up
        total_chapters: totalChapters,
        current_chapter_index: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error("Failed to create test order:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create test order" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`Admin ${user.id} created test proofreading order ${order.id} for project ${projectId}`);

    // Call process-proofreading function (fire-and-forget, don't await)
    const processUrl = `${supabaseUrl}/functions/v1/process-proofreading`;
    
    // Fire-and-forget: trigger processing but don't wait for it
    fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ orderId: order.id }),
    }).catch((err) => {
      console.error("Failed to trigger proofreading process:", err);
    });

    console.log(`Admin ${user.id} triggered test proofreading for order ${order.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: order.id,
        message: "Test proofreading started successfully",
        totalChapters,
        totalWords,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in admin-test-proofreading:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
