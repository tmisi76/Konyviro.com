import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to?: string;
  subject: string;
  html: string;
  text?: string;
  isTest?: boolean;
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

    const { to, subject, html, text, isTest }: EmailRequest = await req.json();

    // For test emails, send to the admin's own email
    const recipientEmail = isTest ? userData.user.email : to;
    if (!recipientEmail) {
      throw new Error("No recipient email");
    }

    // Send email using fetch to Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ink Story <noreply@digitalisbirodalom.hu>",
        to: [recipientEmail],
        subject: isTest ? `[TESZT] ${subject}` : subject,
        html: html,
        text: text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Resend error:", errorData);
      throw new Error(errorData.message || "Failed to send email");
    }

    const data = await response.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-admin-email:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
