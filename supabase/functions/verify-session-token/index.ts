import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shareToken, sessionToken } = await req.json();

    if (!shareToken || typeof shareToken !== "string") {
      return new Response(
        JSON.stringify({ error: "Share token is required", valid: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sessionToken || typeof sessionToken !== "string") {
      return new Response(
        JSON.stringify({ error: "Session token is required", valid: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to validate session - no client access to this table
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First get the share to find its ID
    const { data: share, error: shareError } = await supabase
      .from("book_shares")
      .select("id")
      .eq("share_token", shareToken)
      .maybeSingle();

    if (shareError || !share) {
      return new Response(
        JSON.stringify({ error: "Share not found", valid: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if session token is valid and not expired
    const { data: accessData, error: accessError } = await supabase
      .from("book_share_access")
      .select("expires_at")
      .eq("share_id", share.id)
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (accessError || !accessData) {
      return new Response(
        JSON.stringify({ valid: false, error: "Session not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (new Date(accessData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: "Session expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-session-token:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", valid: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
