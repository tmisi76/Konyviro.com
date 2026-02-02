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
    const { ticketId, message, recipientEmail, ticketSubject } = await req.json();

    if (!recipientEmail) {
      throw new Error("recipientEmail is required");
    }

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
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #7c3aed; margin: 0;">📩 Válasz érkezett!</h1>
      <p style="color: #666; margin: 10px 0 0;">A KönyvÍró csapata válaszolt a kérdésedre</p>
    </div>
    
    <div style="background: #f8f9fa; border-left: 4px solid #7c3aed; padding: 15px 20px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 5px; font-size: 12px; color: #888;">Eredeti tárgy:</p>
      <p style="margin: 0; font-weight: bold; color: #333;">${ticketSubject || 'Support kérés'}</p>
    </div>
    
    <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #e9d5ff;">
      <h3 style="margin: 0 0 10px; color: #7c3aed; font-size: 14px;">💬 Válaszunk:</h3>
      <p style="margin: 0; white-space: pre-wrap; color: #333; line-height: 1.6;">${message}</p>
    </div>
    
    <div style="text-align: center;">
      <a href="https://konyviro.com/dashboard" 
         style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Ugrás az alkalmazásba →
      </a>
    </div>
    
    <p style="margin: 25px 0 0; color: #888; font-size: 12px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
      Ha további kérdésed van, válaszolj erre az emailre.<br>
      <strong style="color: #7c3aed;">A KönyvÍró csapata</strong>
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
        from: "KönyvÍró Support <support@digitalisbirodalom.hu>",
        to: [recipientEmail],
        reply_to: "tmisi76@gmail.com",
        subject: `📩 Válasz a kérdésedre: ${ticketSubject || 'Support kérés'}`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      throw new Error(`Email failed: ${errorText}`);
    }

    console.log("[SEND-TICKET-REPLY-EMAIL] Reply email sent to:", recipientEmail);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[SEND-TICKET-REPLY-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
