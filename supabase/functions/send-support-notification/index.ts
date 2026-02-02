import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, subject, description, userEmail, userName } = await req.json();

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h1 style="color: #7c3aed; margin: 0 0 20px;">🎫 Új support ticket!</h1>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; width: 100px;">Feladó:</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">${userName || userEmail || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Email:</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${userEmail || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Tárgy:</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">${subject}</td>
      </tr>
    </table>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px; color: #333;">Üzenet:</h3>
      <p style="margin: 0; white-space: pre-wrap; color: #555;">${description}</p>
    </div>
    
    <a href="https://konyviro.com/admin/support/${ticketId}" 
       style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
      Ticket megtekintése →
    </a>
    
    <p style="margin: 20px 0 0; color: #888; font-size: 12px; text-align: center;">
      KönyvÍró Support Értesítő
    </p>
  </div>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "KönyvÍró Support <noreply@digitalisbirodalom.hu>",
        to: ["tmisi76@gmail.com"],
        subject: `🎫 Új ticket: ${subject}`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      throw new Error(`Email failed: ${errorText}`);
    }

    console.log("[SEND-SUPPORT-NOTIFICATION] Admin notification sent");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[SEND-SUPPORT-NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
