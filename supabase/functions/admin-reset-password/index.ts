import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-RESET-PASSWORD] ${step}${detailsStr}`);
};

function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const adminUserId = userData.user?.id;
    if (!adminUserId) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: adminCheck } = await supabaseAdmin
      .from("admin_users")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("is_active", true)
      .single();

    if (!adminCheck) {
      throw new Error("Unauthorized: Admin access required");
    }
    logStep("Admin verified", { adminUserId, role: adminCheck.role });

    // Parse request body
    const body = await req.json();
    const { user_id, action = "generate_and_send" } = body;
    // action can be: "generate_and_send", "send_reset_link"

    if (!user_id) throw new Error("user_id is required");
    logStep("Request parsed", { user_id, action });

    // Get user info
    const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (getUserError || !targetUser.user) {
      throw new Error(`User not found: ${getUserError?.message || "Unknown error"}`);
    }
    
    const userEmail = targetUser.user.email;
    if (!userEmail) throw new Error("User has no email");
    logStep("Target user found", { email: userEmail });

    // Get user's full name from profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", user_id)
      .single();

    const fullName = profile?.full_name || "Felhasználó";

    if (action === "send_reset_link") {
      // Use Supabase's built-in password reset
      const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: userEmail,
        options: {
          redirectTo: "https://ink-story-magic-86.lovable.app/auth?reset=true",
        },
      });

      if (resetError) {
        throw new Error(`Failed to generate reset link: ${resetError.message}`);
      }
      logStep("Reset link generated");

      // Log admin activity
      await supabaseAdmin.from("admin_activity_logs").insert({
        admin_user_id: adminUserId,
        action: "send_password_reset_link",
        entity_type: "user",
        entity_id: user_id,
        details: { email: userEmail },
      });

      return new Response(JSON.stringify({
        success: true,
        message: "Password reset link sent",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Generate new password and update user
    const newPassword = generatePassword();
    
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: newPassword,
    });

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }
    logStep("Password updated");

    // Send email with new password
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendKey) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Ink Story <noreply@digitalisbirodalom.hu>",
            to: [userEmail],
            subject: "Új jelszavad az Ink Story-hoz",
            html: `
              <h2>Új jelszó</h2>
              <p>Kedves ${fullName}!</p>
              <p>Az adminisztrátor új jelszót állított be a fiókodhoz.</p>
              <p><strong>Új jelszavad:</strong> ${newPassword}</p>
              <p>Kérjük, változtasd meg a jelszavad az első bejelentkezés után!</p>
              <p><a href="https://ink-story-magic-86.lovable.app/auth">Bejelentkezés</a></p>
              <p>Üdvözlettel,<br>Az Ink Story csapata</p>
            `,
          }),
        });

        emailSent = emailRes.ok;
        if (!emailRes.ok) {
          const errorText = await emailRes.text();
          logStep("Email send failed", { error: errorText });
        } else {
          logStep("Email sent successfully");
        }
      } catch (emailError) {
        logStep("Email error", { error: String(emailError) });
      }
    }

    // Log admin activity
    await supabaseAdmin.from("admin_activity_logs").insert({
      admin_user_id: adminUserId,
      action: "reset_password",
      entity_type: "user",
      entity_id: user_id,
      details: { email: userEmail, email_sent: emailSent },
    });

    return new Response(JSON.stringify({
      success: true,
      password: newPassword,
      email_sent: emailSent,
      message: emailSent ? "New password sent via email" : "Password updated (email not sent)",
    }), {
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
