import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        getHtmlResponse("Hiba", "Érvénytelen leiratkozási link.", false),
        {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if already unsubscribed
    const { data: existing } = await supabase
      .from("email_unsubscribes")
      .select("id")
      .eq("token", token)
      .single();

    if (existing) {
      return new Response(
        getHtmlResponse("Már leiratkoztál", "Ez az email cím már korábban leiratkozott a hírlevelünkről.", true),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
        }
      );
    }

    // Decode token to get email (token format: base64(email:uuid))
    let email: string;
    try {
      const decoded = atob(token);
      const parts = decoded.split(":");
      email = parts.slice(0, -1).join(":"); // In case email contains ":"
    } catch {
      return new Response(
        getHtmlResponse("Hiba", "Érvénytelen leiratkozási link.", false),
        {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
        }
      );
    }

    // Find user by email if exists
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);

    // Insert unsubscribe record
    const { error: insertError } = await supabase
      .from("email_unsubscribes")
      .insert({
        email,
        token,
        user_id: user?.id || null,
        reason: "Leiratkozás linkre kattintás",
      });

    if (insertError) {
      console.error("Error inserting unsubscribe:", insertError);
      return new Response(
        getHtmlResponse("Hiba", "Nem sikerült a leiratkozás. Kérjük, próbáld újra később.", false),
        {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
        }
      );
    }

    return new Response(
      getHtmlResponse("Sikeres leiratkozás!", "Sikeresen leiratkoztál a marketing emailekről. Többé nem fogsz ilyen típusú üzeneteket kapni tőlünk.", true),
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in unsubscribe-email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      getHtmlResponse("Hiba", `Váratlan hiba történt: ${message}`, false),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
      }
    );
  }
});

function getHtmlResponse(title: string, message: string, success: boolean): string {
  const icon = success 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - KönyvÍró</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 48px;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .icon { margin-bottom: 24px; }
    h1 {
      color: #1e1b4b;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #64748b;
      font-size: 16px;
      line-height: 1.6;
    }
    .logo {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .logo-text {
      font-size: 18px;
      font-weight: 600;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="logo">
      <span class="logo-text">KönyvÍró</span>
    </div>
  </div>
</body>
</html>`;
}
