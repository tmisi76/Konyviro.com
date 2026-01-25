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
const TIER_CONFIG: Record<string, { wordLimit: number; projectLimit: number }> = {
  free: { wordLimit: 1000, projectLimit: 1 },
  hobby: { wordLimit: 50000, projectLimit: 1 },
  writer: { wordLimit: 200000, projectLimit: 5 },
  pro: { wordLimit: 999999999, projectLimit: 999 },
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

    // Create user with Supabase Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { full_name },
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }
    logStep("User created in auth", { userId: newUser.user.id });

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

    // Update profile with subscription details
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
    logStep("Profile updated", { subscription_tier, billing_period });

    // Send emails if requested
    const resendKey = Deno.env.get("RESEND_API_KEY");
    
    if ((send_welcome_email || send_password_email) && resendKey) {
      const emailSubject = send_password_email 
        ? "Üdvözlünk az Ink Story-ban - Bejelentkezési adataid"
        : "Üdvözlünk az Ink Story-ban!";
      
      let emailBody = `
        <h2>Üdvözlünk az Ink Story-ban!</h2>
        <p>Kedves ${full_name || "Felhasználó"}!</p>
        <p>Fiókod sikeresen létrehoztuk.</p>
      `;

      if (send_password_email) {
        emailBody += `
          <p><strong>Bejelentkezési adataid:</strong></p>
          <ul>
            <li>Email: ${email}</li>
            <li>Jelszó: ${password}</li>
          </ul>
          <p>Kérjük, változtasd meg a jelszavad az első bejelentkezés után!</p>
        `;
      }

      emailBody += `
        <p><strong>Előfizetésed:</strong> ${subscription_tier.toUpperCase()} (${billing_period === "yearly" ? "éves" : "havi"})</p>
        <p><a href="https://ink-story-magic-86.lovable.app/auth">Bejelentkezés</a></p>
        <p>Üdvözlettel,<br>Az Ink Story csapata</p>
      `;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Ink Story <noreply@inkstory.hu>",
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

    logStep("User creation complete");

    return new Response(JSON.stringify({
      success: true,
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
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
