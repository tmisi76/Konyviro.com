import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-WELCOME-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email, full_name } = await req.json();
    if (!email) {
      throw new Error("Email is required");
    }
    logStep("Request received", { email, full_name });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const displayName = full_name || "Felhasználó";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">✨ Üdvözlünk az Ink Story-ban!</h1>
    </div>
    
    <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 18px; color: #1e293b; margin: 0 0 20px;">Kedves <strong>${displayName}</strong>!</p>
      
      <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
        Örömmel üdvözlünk az Ink Story közösségében! Készen állsz, hogy megírd életed könyvét? 📚
      </p>
      
      <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 24px; margin: 0 0 30px; border: 1px solid #e9d5ff;">
        <h3 style="color: #7c3aed; margin: 0 0 16px; font-size: 16px;">🚀 Gyors indulás</h3>
        <ul style="color: #475569; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Hozz létre egy új könyv projektet</li>
          <li>Válaszd ki a műfajt és stílust</li>
          <li>Írd meg a történet vázlatát, vagy hagyd az AI-ra</li>
          <li>Generáld le a fejezeteket egyenként</li>
        </ul>
      </div>
      
      <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin: 0 0 30px; border: 1px solid #bbf7d0;">
        <h3 style="color: #16a34a; margin: 0 0 12px; font-size: 16px;">🎁 Ingyenes csomagod</h3>
        <p style="color: #475569; font-size: 14px; margin: 0;">
          • <strong>1000 szó kredit</strong> havonta<br>
          • <strong>1 könyv projekt</strong><br>
          • Hozzáférés az AI írás asszisztenshez
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ink-story-magic-86.lovable.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Kezdjünk írni! →
        </a>
      </div>
      
      <p style="font-size: 14px; color: #94a3b8; text-align: center; margin: 30px 0 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        Ha bármilyen kérdésed van, ne habozz írni!<br>
        <strong style="color: #7c3aed;">Az Ink Story csapata</strong>
      </p>
    </div>
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
        from: "Ink Story <noreply@digitalisbirodalom.hu>",
        to: [email],
        subject: "✨ Üdvözlünk az Ink Story-ban!",
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      logStep("Email failed", { error: errorText });
      throw new Error("Failed to send email");
    }

    logStep("Welcome email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
