import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-CREATE-USER] ${step}${detailsStr}`);
};

// Tier configurations
const TIER_CONFIG: Record<string, { wordLimit: number; projectLimit: number; storybookCredits: number }> = {
  free: { wordLimit: 1000, projectLimit: 1, storybookCredits: 0 },
  hobby: { wordLimit: 50000, projectLimit: 1, storybookCredits: 1 },
  writer: { wordLimit: 200000, projectLimit: 5, storybookCredits: 5 },
  pro: { wordLimit: 999999999, projectLimit: 999, storybookCredits: 999 },
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
      email,
      full_name,
      password: providedPassword,
      subscription_tier = "free",
      billing_period = "monthly",
      payment_method = "manual",
      send_welcome_email = false,
      send_password_email = false,
      admin_notes = "",
    } = body;

    if (!email) throw new Error("Email is required");
    logStep("Request parsed", { email, subscription_tier, billing_period, payment_method });

    // Generate password if not provided
    const password = providedPassword || generatePassword();
    const passwordWasGenerated = !providedPassword;
    logStep("Password ready", { generated: passwordWasGenerated });

    // Check if user already exists by paginating through auth users
    let existingAuthUser: { id: string; email?: string } | null = null;
    {
      const normalizedEmail = email.toLowerCase().trim();
      let page = 1;
      const perPage = 1000;
      // Limit to 10 pages (10,000 users) to avoid infinite loop
      while (page <= 10) {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (listError) {
          logStep("listUsers error", { error: listError.message });
          break;
        }
        const found = listData.users.find(u => (u.email || "").toLowerCase() === normalizedEmail);
        if (found) {
          existingAuthUser = { id: found.id, email: found.email };
          break;
        }
        if (listData.users.length < perPage) break;
        page++;
      }
    }

    let newUser: { user: { id: string } };
    let mode: "created" | "updated_existing" = "created";

    if (existingAuthUser) {
      logStep("Existing auth user found", { userId: existingAuthUser.id });

      // Check existing profile
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("subscription_tier, subscription_status, manual_subscription")
        .eq("user_id", existingAuthUser.id)
        .maybeSingle();

      const isPaidActive = existingProfile
        && existingProfile.subscription_tier !== "free"
        && existingProfile.subscription_status === "active";

      if (isPaidActive) {
        // Block: user already has an active paid subscription
        return new Response(JSON.stringify({
          success: false,
          mode: "already_active",
          message: `Ez az email cím már aktív "${existingProfile.subscription_tier}" előfizetéssel rendelkezik. Használja a Szerkesztés funkciót a módosításhoz.`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Reuse existing user, update profile below
      newUser = { user: { id: existingAuthUser.id } };
      mode = "updated_existing";

      // Optionally update password if admin provided one
      if (providedPassword) {
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
          password: providedPassword,
        });
        if (pwErr) logStep("Password update error", { error: pwErr.message });
      }
    } else {
      // Create new user with Supabase Admin API
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }
      newUser = { user: { id: created.user.id } };
      logStep("User created in auth", { userId: newUser.user.id });
    }

    // Calculate word limits based on billing period
    const tierConfig = TIER_CONFIG[subscription_tier] || TIER_CONFIG.free;
    let monthlyWordLimit = tierConfig.wordLimit;
    let extraWordsBalance = 0;

    // For yearly subscriptions, give all credits upfront
    if (billing_period === "yearly" && subscription_tier !== "free") {
      extraWordsBalance = tierConfig.wordLimit * 12;
      monthlyWordLimit = 0; // Use extra_words_balance instead
      logStep("Yearly credits calculated", { extraWordsBalance });
    }

    // Calculate subscription dates
    const subscriptionStartDate = new Date().toISOString();
    let subscriptionEndDate: string | null = null;
    
    if (subscription_tier !== "free") {
      const endDate = new Date();
      if (billing_period === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }
      subscriptionEndDate = endDate.toISOString();
    }

    // Update profile with subscription details including storybook credits
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        subscription_tier,
        subscription_status: "active",
        subscription_start_date: subscriptionStartDate,
        subscription_end_date: subscriptionEndDate,
        monthly_word_limit: monthlyWordLimit,
        extra_words_balance: extraWordsBalance,
        project_limit: tierConfig.projectLimit,
        storybook_credit_limit: tierConfig.storybookCredits,
        payment_method,
        billing_period,
        manual_subscription: true,
        admin_notes,
      })
      .eq("user_id", newUser.user.id);

    if (profileError) {
      logStep("Profile update error", { error: profileError.message });
      // Don't throw, profile might be created by trigger
    }
    logStep("Profile updated", { subscription_tier, billing_period, storybookCredits: tierConfig.storybookCredits });

    // Send emails if requested
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const tierNames: Record<string, string> = {
      free: "Ingyenes",
      hobby: "Hobbi",
      writer: "Író",
      pro: "Pro"
    };
    const periodNames: Record<string, string> = {
      monthly: "havi",
      yearly: "éves"
    };
    
    if ((send_welcome_email || send_password_email) && resendKey) {
      const emailSubject = send_password_email 
        ? "Üdvözlünk a KönyvÍró-nál - Bejelentkezési adataid"
        : "Üdvözlünk a KönyvÍró-nál!";
      
      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">✨ Üdvözlünk a KönyvÍró-nál!</h1>
    </div>
    
    <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 18px; color: #1e293b; margin: 0 0 20px;">Kedves <strong>${full_name || "Felhasználó"}</strong>!</p>
      
      <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 30px;">
        Örömmel értesítünk, hogy fiókod sikeresen létrehoztuk. Készen állsz arra, hogy megírd a következő könyvedet!
      </p>
      
      ${send_password_email ? `
      <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 0 0 30px;">
        <h3 style="color: #7c3aed; margin: 0 0 16px; font-size: 16px;">🔐 Bejelentkezési adataid</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Jelszó:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px; font-family: monospace;">${password}</td>
          </tr>
        </table>
        <p style="color: #ef4444; font-size: 13px; margin: 16px 0 0;">⚠️ Kérjük, változtasd meg a jelszavad az első bejelentkezés után!</p>
      </div>
      ` : ''}
      
      <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 24px; margin: 0 0 30px; border: 1px solid #e9d5ff;">
        <h3 style="color: #7c3aed; margin: 0 0 16px; font-size: 16px;">📦 Előfizetésed részletei</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Csomag:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${tierNames[subscription_tier] || subscription_tier}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Időszak:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${periodNames[billing_period] || billing_period}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Szó kredit:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${(extraWordsBalance || monthlyWordLimit).toLocaleString()} szó</td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://konyviro.com/auth" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Bejelentkezés →
        </a>
      </div>
      
      <p style="font-size: 14px; color: #94a3b8; text-align: center; margin: 30px 0 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        Ha bármilyen kérdésed van, írj nekünk!<br>
        <strong style="color: #7c3aed;">A KönyvÍró csapata</strong>
      </p>
    </div>
  </div>
</body>
</html>`;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "KönyvÍró <noreply@digitalisbirodalom.hu>",
            to: [email],
            subject: emailSubject,
            html: emailBody,
          }),
        });

        if (emailRes.ok) {
          logStep("Email sent successfully");
        } else {
          const errorText = await emailRes.text();
          logStep("Email send failed", { error: errorText });
        }
      } catch (emailError) {
        logStep("Email error", { error: String(emailError) });
      }
    }

    // Log admin activity
    await supabaseAdmin.from("admin_activity_logs").insert({
      admin_user_id: adminCheck.role === "super_admin" ? adminUserId : null,
      action: "create_user",
      entity_type: "user",
      entity_id: newUser.user.id,
      details: {
        email,
        subscription_tier,
        billing_period,
        payment_method,
        password_sent: send_password_email,
      },
    });

    logStep("User creation complete", { mode });

    const successMessage = mode === "updated_existing"
      ? "Meglévő felhasználó frissítve az új előfizetéssel."
      : "Felhasználó sikeresen létrehozva.";

    return new Response(JSON.stringify({
      success: true,
      mode,
      message: successMessage,
      user_id: newUser.user.id,
      email,
      password: passwordWasGenerated && send_password_email ? password : undefined,
      subscription_tier,
      billing_period,
      extra_words_balance: extraWordsBalance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage, message: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
