import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkEmailRequest {
  templateId: string;
  recipientType: "all" | "plan" | "custom";
  selectedPlan?: string;
  customEmails?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin status
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: adminData } = await supabaseClient
      .from("admin_users")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .single();

    if (!adminData) {
      throw new Error("Admin access required");
    }

    const { templateId, recipientType, selectedPlan, customEmails }: BulkEmailRequest = await req.json();

    // Fetch template
    const { data: template, error: templateError } = await supabaseClient
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      throw new Error("Template not found");
    }

    // Get recipient emails
    let emails: string[] = [];

    if (recipientType === "custom" && customEmails) {
      emails = customEmails;
    } else {
      // Fetch from auth.users via admin API
      const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers();
      
      if (usersError) {
        throw new Error("Failed to fetch users");
      }

      if (recipientType === "all") {
        emails = users.map(u => u.email).filter(Boolean) as string[];
      } else if (recipientType === "plan" && selectedPlan) {
        // Get user IDs with specific plan
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("user_id")
          .eq("subscription_tier", selectedPlan);

        const planUserIds = new Set(profiles?.map(p => p.user_id) || []);
        emails = users
          .filter(u => planUserIds.has(u.id))
          .map(u => u.email)
          .filter(Boolean) as string[];
      }
    }

    if (emails.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, message: "No recipients found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let sent = 0;
    let failed = 0;

    // Send emails in batches of 10
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const promises = batch.map(async (email) => {
        try {
          // Replace variables in template
          let html = template.body_html;
          let subject = template.subject;

          // Basic variable replacement
          html = html.replace(/\{\{email\}\}/g, email);
          subject = subject.replace(/\{\{email\}\}/g, email);

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "KönyvÍró AI <noreply@resend.dev>",
              to: [email],
              subject: subject,
              html: html,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to send");
          }
          sent++;
        } catch (error) {
          console.error(`Failed to send to ${email}:`, error);
          failed++;
        }
      });

      await Promise.all(promises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < emails.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    console.log(`Bulk email complete: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ sent, failed }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-bulk-email:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
