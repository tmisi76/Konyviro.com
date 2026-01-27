import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email szolgáltatás nincs konfigurálva" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, wordsPurchased, amountPaid, newBalance } = await req.json();

    if (!email || !wordsPurchased) {
      return new Response(
        JSON.stringify({ error: "Hiányzó paraméterek" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://id-preview--8c4162da-8f59-4bd1-96d2-4494bcc979d1.lovable.app";

    const formattedWords = Number(wordsPurchased).toLocaleString("hu-HU");
    const formattedAmount = Number(amountPaid).toLocaleString("hu-HU");
    const formattedBalance = newBalance ? Number(newBalance).toLocaleString("hu-HU") : null;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Ink Story <noreply@digitalisbirodalom.hu>",
        to: [email],
        subject: `✅ Sikeres kredit vásárlás: ${formattedWords} szó`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; margin-bottom: 10px;">✅ Sikeres vásárlás!</h1>
              <h2 style="color: #333; font-weight: normal;">Kredit feltöltve</h2>
            </div>
            
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #86efac;">
              <div style="text-align: center;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Vásárolt kredit</p>
                <h3 style="margin: 0; color: #166534; font-size: 32px; font-weight: bold;">${formattedWords} szó</h3>
              </div>
            </div>

            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Fizetett összeg:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedAmount} Ft</td>
                </tr>
                ${formattedBalance ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Új egyenleg:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #166534;">${formattedBalance} szó</td>
                </tr>
                ` : ""}
              </table>
            </div>

            <p style="color: #4b5563;">A kredit azonnal felhasználható:</p>
            <ul style="color: #4b5563; padding-left: 20px;">
              <li>AI-alapú könyvírásra</li>
              <li>Fejezetek és jelenetek generálására</li>
              <li>Történet bővítésére és átírására</li>
            </ul>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${appUrl}/dashboard" 
                 style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Irány az írás! →
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            
            <p style="color: #9ca3af; font-size: 14px; text-align: center;">
              Köszönjük, hogy a Könyvíró AI-t választottad!<br>
              Ez az email automatikusan lett kiküldve a vásárlás megerősítéseként.
            </p>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(errorData.message || "Email küldése sikertelen");
    }

    const result = await emailResponse.json();
    console.log("Credit email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error sending credit email:", error);
    const message = error instanceof Error ? error.message : "Ismeretlen hiba";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
