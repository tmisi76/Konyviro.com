import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-SEND-CREDENTIALS] ${step}${detailsStr}`);
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
    const {
      user_id,
      generate_new_password = true,
      is_admin_reminder = false,
      custom_message = "",
    } = body;

    if (!user_id) throw new Error("user_id is required");
    logStep("Request parsed", { user_id, generate_new_password, is_admin_reminder });

    // Get target user info from auth
    const { data: targetUser, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (targetUserError || !targetUser.user) {
      throw new Error(`User not found: ${targetUserError?.message || 'Unknown error'}`);
    }
    
    const email = targetUser.user.email;
    if (!email) throw new Error("User has no email address");
    logStep("Target user found", { email });

    // Get profile data
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, subscription_tier, billing_period")
      .eq("user_id", user_id)
      .single();

    const fullName = profile?.full_name || email.split('@')[0];
    const tier = profile?.subscription_tier || 'free';
    const period = profile?.billing_period || 'monthly';
    
    // Check if user is admin (for admin reminder)
    const { data: isTargetAdmin } = await supabaseAdmin
      .from("admin_users")
      .select("role")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .single();

    let password = "";
    
    // Generate new password if requested
    if (generate_new_password && !is_admin_reminder) {
      password = generatePassword();
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: password,
      });
      
      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }
      logStep("Password updated");
    }

    // Send email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const tierNames: Record<string, string> = {
      free: "Ingyenes",
      hobby: "Hobbi",
      writer: "Író",
      pro: "Pro"
    };

    let emailSubject: string;
    let emailBody: string;

    if (is_admin_reminder) {
      // Admin reminder email
      emailSubject = "Emlékeztető - Admin hozzáférés az Ink Story-hoz";
      emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🛡️ Admin Emlékeztető</h1>
    </div>
    
    <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 18px; color: #1e293b; margin: 0 0 20px;">Kedves <strong>${fullName}</strong>!</p>
      
      <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 30px;">
        Ez egy emlékeztető az Ink Story admin hozzáférésedről.
      </p>
      
      <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin: 0 0 30px; border: 1px solid #fecaca;">
        <h3 style="color: #dc2626; margin: 0 0 16px; font-size: 16px;">🔐 Admin hozzáférés</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Szerepkör:</td>
            <td style="padding: 8px 0; color: #dc2626; font-weight: 600; font-size: 14px;">${isTargetAdmin?.role || 'admin'}</td>
          </tr>
        </table>
      </div>
      
      ${custom_message ? `
      <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 0 0 30px;">
        <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.6;">${custom_message}</p>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ink-story-magic-86.lovable.app/admin" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Admin felület megnyitása →
        </a>
      </div>
      
      <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 30px 0 0;">
        Ha elfelejtetted a jelszavad, kérj új jelszót a bejelentkezési oldalon.
      </p>
    </div>
  </div>
</body>
</html>`;
    } else {
      // Regular credentials email
      emailSubject = generate_new_password 
        ? "Új belépési adatok - Ink Story"
        : "Belépési emlékeztető - Ink Story";
        
      emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🔐 Belépési adataid</h1>
    </div>
    
    <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 18px; color: #1e293b; margin: 0 0 20px;">Kedves <strong>${fullName}</strong>!</p>
      
      <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 30px;">
        ${generate_new_password ? 'Új jelszót generáltunk a fiókodhoz.' : 'Itt találod a belépési adataidat.'}
      </p>
      
      <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 0 0 30px;">
        <h3 style="color: #7c3aed; margin: 0 0 16px; font-size: 16px;">🔐 Bejelentkezési adatok</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${email}</td>
          </tr>
          ${generate_new_password ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Új jelszó:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px; font-family: monospace;">${password}</td>
          </tr>
          ` : ''}
        </table>
        ${generate_new_password ? `
        <p style="color: #ef4444; font-size: 13px; margin: 16px 0 0;">⚠️ Kérjük, változtasd meg a jelszavad a bejelentkezés után!</p>
        ` : ''}
      </div>
      
      <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 24px; margin: 0 0 30px; border: 1px solid #e9d5ff;">
        <h3 style="color: #7c3aed; margin: 0 0 16px; font-size: 16px;">📦 Előfizetésed</h3>
        <p style="color: #1e293b; margin: 0; font-size: 16px;">
          <strong>${tierNames[tier] || tier}</strong> csomag
        </p>
      </div>
      
      ${custom_message ? `
      <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 0 0 30px;">
        <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.6;">${custom_message}</p>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ink-story-magic-86.lovable.app/auth" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Bejelentkezés →
        </a>
      </div>
      
      <p style="font-size: 14px; color: #94a3b8; text-align: center; margin: 30px 0 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        Ha nem te kérted ezt az emailt, kérjük jelezd nekünk!<br>
        <strong style="color: #7c3aed;">Az Ink Story csapata</strong>
      </p>
    </div>
  </div>
</body>
</html>`;
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Ink Story <noreply@digitalisbirodalom.hu>",
        to: [email],
        subject: emailSubject,
        html: emailBody,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }
    logStep("Email sent successfully");

    // Log admin activity
    await supabaseAdmin.from("admin_activity_logs").insert({
      admin_user_id: adminCheck.role === "super_admin" ? adminUserId : null,
      action: is_admin_reminder ? "send_admin_reminder" : "send_credentials",
      entity_type: "user",
      entity_id: user_id,
      details: {
        email,
        password_reset: generate_new_password,
        is_admin_reminder,
      },
    });

    logStep("Credentials sent successfully");

    return new Response(JSON.stringify({
      success: true,
      email,
      password_reset: generate_new_password,
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
