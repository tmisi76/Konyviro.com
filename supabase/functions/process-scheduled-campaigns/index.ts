import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find scheduled campaigns that are due
    const { data: campaigns, error: fetchError } = await supabase
      .from("admin_email_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch campaigns: ${fetchError.message}`);
    }

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scheduled campaigns to process" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Processing ${campaigns.length} scheduled campaign(s)`);

    const results = [];

    for (const campaign of campaigns) {
      try {
        // Update status to sending
        await supabase
          .from("admin_email_campaigns")
          .update({ 
            status: "sending",
            started_at: new Date().toISOString(),
          })
          .eq("id", campaign.id);

        // Get unsubscribed emails
        const { data: unsubscribes } = await supabase
          .from("email_unsubscribes")
          .select("email");
        
        const unsubscribedEmails = new Set(
          (unsubscribes || []).map((u: { email: string }) => u.email.toLowerCase())
        );

        // Get recipients based on type
        let recipients: { email: string; name: string | null }[] = [];
        const filter = campaign.recipient_filter as Record<string, unknown>;

        if (campaign.recipient_type === "all") {
          const { data: users } = await supabase.auth.admin.listUsers();
          recipients = (users?.users || []).map((u) => ({
            email: u.email!,
            name: u.user_metadata?.full_name || null,
          }));
        } else if (campaign.recipient_type === "plan") {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .eq("subscription_tier", filter.plan);
          
          if (profiles) {
            const userIds = profiles.map((p) => p.user_id);
            const { data: users } = await supabase.auth.admin.listUsers();
            recipients = (users?.users || [])
              .filter((u) => userIds.includes(u.id))
              .map((u) => ({
                email: u.email!,
                name: profiles.find((p) => p.user_id === u.id)?.full_name || null,
              }));
          }
        } else if (campaign.recipient_type === "inactive") {
          const inactiveDays = filter.inactive_days as number;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .lt("updated_at", cutoffDate.toISOString());

          if (profiles) {
            const userIds = profiles.map((p) => p.user_id);
            const { data: users } = await supabase.auth.admin.listUsers();
            recipients = (users?.users || [])
              .filter((u) => userIds.includes(u.id))
              .map((u) => ({
                email: u.email!,
                name: profiles.find((p) => p.user_id === u.id)?.full_name || null,
              }));
          }
        } else if (campaign.recipient_type === "custom") {
          const customEmails = filter.custom_emails as string[];
          recipients = customEmails.map((email) => ({ email, name: null }));
        }

        // Filter out unsubscribed emails
        const filteredRecipients = recipients.filter(
          (r) => !unsubscribedEmails.has(r.email.toLowerCase())
        );

        console.log(`Campaign ${campaign.id}: ${filteredRecipients.length} recipients`);

        // Send emails in batches
        let sentCount = 0;
        let failedCount = 0;
        const batchSize = 10;

        for (let i = 0; i < filteredRecipients.length; i += batchSize) {
          const batch = filteredRecipients.slice(i, i + batchSize);
          
          for (const recipient of batch) {
            try {
              // Generate unsubscribe token
              const unsubscribeToken = btoa(`${recipient.email}:${crypto.randomUUID()}`);
              const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-email?token=${encodeURIComponent(unsubscribeToken)}`;

              // Replace variables in content
              let html = campaign.body_html;
              html = html.replace(/\{\{user_name\}\}/g, recipient.name || "Kedves Felhasználó");
              html = html.replace(/\{\{email\}\}/g, recipient.email);

              // Add unsubscribe footer
              html += getUnsubscribeFooter(unsubscribeUrl);

              await resend.emails.send({
                from: "KönyvÍró <noreply@digitalisbirodalom.hu>",
                to: [recipient.email],
                subject: campaign.subject,
                html: html,
              });

              sentCount++;
            } catch (error) {
              console.error(`Failed to send to ${recipient.email}:`, error);
              failedCount++;
            }
          }

          // Update progress
          await supabase
            .from("admin_email_campaigns")
            .update({ sent_count: sentCount, failed_count: failedCount })
            .eq("id", campaign.id);
        }

        // Mark as completed
        await supabase
          .from("admin_email_campaigns")
          .update({
            status: failedCount > 0 && sentCount === 0 ? "failed" : "completed",
            completed_at: new Date().toISOString(),
            sent_count: sentCount,
            failed_count: failedCount,
          })
          .eq("id", campaign.id);

        results.push({
          campaignId: campaign.id,
          sent: sentCount,
          failed: failedCount,
        });

      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        
        // Mark campaign as failed
        await supabase
          .from("admin_email_campaigns")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", campaign.id);

        results.push({
          campaignId: campaign.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: campaigns.length,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in process-scheduled-campaigns:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

function getUnsubscribeFooter(unsubscribeUrl: string): string {
  return `
    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        Ha nem szeretnél több marketing emailt kapni, 
        <a href="${unsubscribeUrl}" style="color: #7c3aed; text-decoration: underline;">
          kattints ide a leiratkozáshoz
        </a>.
      </p>
    </div>
  `;
}
