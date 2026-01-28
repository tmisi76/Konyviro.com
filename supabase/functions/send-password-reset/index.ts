import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PASSWORD-RESET] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email } = await req.json();
    if (!email) {
      throw new Error("Email is required");
    }
    logStep("Email received", { email });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if user exists
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Don't reveal that user doesn't exist for security
      logStep("User not found, returning success anyway for security");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get user profile for name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const fullName = profile?.full_name || "Felhasználó";

    // Generate password reset link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: "https://konyviro.com/auth?mode=reset",
      },
    });

    if (linkError) {
      logStep("Failed to generate link", { error: linkError.message });
      throw new Error("Failed to generate password reset link");
    }

    const resetLink = linkData?.properties?.action_link;
    if (!resetLink) {
      throw new Error("No reset link generated");
    }
    logStep("Reset link generated");

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

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
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🔐 Jelszó visszaállítás</h1>
    </div>
    
    <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 18px; color: #1e293b; margin: 0 0 20px;">Kedves <strong>${fullName}</strong>!</p>
      
      <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
        Jelszó-visszaállítási kérelmet kaptunk a fiókoddal kapcsolatban. Ha te kérted, kattints az alábbi gombra az új jelszavad beállításához.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Új jelszó beállítása →
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; text-align: center; margin: 20px 0;">
        Ha a gomb nem működik, másold be ezt a linket a böngésződbe:<br>
        <a href="${resetLink}" style="color: #7c3aed; word-break: break-all;">${resetLink}</a>
      </p>
      
      <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="font-size: 14px; color: #dc2626; margin: 0;">
          ⚠️ Ha nem te kérted a jelszó visszaállítást, hagyd figyelmen kívül ezt az emailt. A jelszavad változatlan marad.
        </p>
      </div>
      
      <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        Ez a link 1 órán belül lejár.<br>
        <strong style="color: #7c3aed;">A KönyvÍró csapata</strong>
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
        from: "KönyvÍró <noreply@digitalisbirodalom.hu>",
        to: [email],
        subject: "🔐 Jelszó visszaállítás - KönyvÍró",
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      logStep("Email failed", { error: errorText });
      throw new Error("Failed to send email");
    }

    logStep("Password reset email sent successfully");

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
