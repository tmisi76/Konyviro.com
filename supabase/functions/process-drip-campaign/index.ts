import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DRIP_STEPS = [
  {
    step: 1,
    subject: "Üdvözlünk a KönyvÍró AI-ban! 🎉",
    template: "welcome-drip-1",
    delayDays: 1,
  },
  {
    step: 2,
    subject: "3 tipp, amivel gyorsabban írhatsz 📝",
    template: "welcome-drip-2",
    delayDays: 3,
  },
  {
    step: 3,
    subject: "Próbáltad már a Könyv Coach-ot? 🤖",
    template: "welcome-drip-3",
    delayDays: 7,
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Get pending drip campaigns that are due
    const { data: pendingCampaigns, error } = await supabase
      .from("drip_campaigns")
      .select("*")
      .eq("status", "pending")
      .lte("next_send_at", new Date().toISOString())
      .limit(50);

    if (error) throw error;

    let processed = 0;

    for (const campaign of pendingCampaigns || []) {
      const stepConfig = DRIP_STEPS.find((s) => s.step === campaign.step);
      if (!stepConfig) {
        // Mark as completed if no more steps
        await supabase
          .from("drip_campaigns")
          .update({ status: "completed" })
          .eq("id", campaign.id);
        continue;
      }

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(campaign.user_id);
      if (!userData?.user?.email) continue;

      // Check if unsubscribed
      const { data: unsub } = await supabase
        .from("email_unsubscribes")
        .select("id")
        .eq("email", userData.user.email)
        .maybeSingle();

      if (unsub) {
        await supabase
          .from("drip_campaigns")
          .update({ status: "unsubscribed" })
          .eq("id", campaign.id);
        continue;
      }

      // Send email via send-admin-email function
      try {
        await supabase.functions.invoke("send-admin-email", {
          body: {
            to: userData.user.email,
            subject: stepConfig.subject,
            html: `<p>Kedves ${userData.user.user_metadata?.full_name || "Író"}!</p>
              <p>Ez egy automatikus üzenet a KönyvÍró AI-tól.</p>
              <p>Lépés: ${stepConfig.step} / ${DRIP_STEPS.length}</p>`,
          },
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }

      // Update campaign to next step
      const nextStep = campaign.step + 1;
      const nextConfig = DRIP_STEPS.find((s) => s.step === nextStep);

      if (nextConfig) {
        const nextSendAt = new Date();
        nextSendAt.setDate(nextSendAt.getDate() + nextConfig.delayDays);

        await supabase
          .from("drip_campaigns")
          .update({
            step: nextStep,
            sent_at: new Date().toISOString(),
            next_send_at: nextSendAt.toISOString(),
          })
          .eq("id", campaign.id);
      } else {
        await supabase
          .from("drip_campaigns")
          .update({
            status: "completed",
            sent_at: new Date().toISOString(),
          })
          .eq("id", campaign.id);
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ processed, total: pendingCampaigns?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Drip campaign error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
