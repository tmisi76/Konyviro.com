import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Query users where more than 30 days have passed since last reset
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const { data: profilesToReset, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .lt("last_credit_reset", oneMonthAgo.toISOString());

    if (error) {
      console.error("Error fetching profiles to reset:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profilesToReset || profilesToReset.length === 0) {
      console.log("No credits to reset.");
      return new Response(
        JSON.stringify({ message: "No credits to reset.", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset credits and update the date
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        storybook_credits_used: 0,
        last_credit_reset: new Date().toISOString(),
      })
      .in("id", profilesToReset.map((p) => p.id));

    if (updateError) {
      console.error("Error resetting credits:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Reset credits for ${profilesToReset.length} users.`);
    return new Response(
      JSON.stringify({ message: `Reset credits for ${profilesToReset.length} users.`, count: profilesToReset.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
