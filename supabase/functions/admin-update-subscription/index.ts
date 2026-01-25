import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-UPDATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Tier configurations
const TIER_CONFIG: Record<string, { wordLimit: number; projectLimit: number }> = {
  free: { wordLimit: 1000, projectLimit: 1 },
  hobby: { wordLimit: 50000, projectLimit: 1 },
  writer: { wordLimit: 200000, projectLimit: 5 },
  pro: { wordLimit: 999999999, projectLimit: 999 },
};

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
      subscription_tier,
      subscription_status,
      billing_period,
      payment_method,
      subscription_start_date,
      subscription_end_date,
      monthly_word_limit,
      extra_words_balance,
      project_limit,
      admin_notes,
      add_extra_credits,
      reset_credits,
    } = body;

    if (!user_id) throw new Error("user_id is required");
    logStep("Request parsed", { user_id, subscription_tier, billing_period });

    // Get current profile
    const { data: currentProfile, error: profileFetchError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (profileFetchError) {
      throw new Error(`Profile not found: ${profileFetchError.message}`);
    }
    logStep("Current profile fetched");

    // Build update object
    const updates: Record<string, unknown> = {
      manual_subscription: true,
      updated_at: new Date().toISOString(),
    };

    // Handle tier change
    if (subscription_tier !== undefined && subscription_tier !== currentProfile.subscription_tier) {
      updates.subscription_tier = subscription_tier;
      
      // Update limits based on tier
      const tierConfig = TIER_CONFIG[subscription_tier] || TIER_CONFIG.free;
      
      if (monthly_word_limit === undefined) {
        // If not explicitly set, calculate based on billing period
        const period = billing_period || currentProfile.billing_period || "monthly";
        if (period === "yearly" && subscription_tier !== "free") {
          updates.monthly_word_limit = 0;
          updates.extra_words_balance = tierConfig.wordLimit * 12;
        } else {
          updates.monthly_word_limit = tierConfig.wordLimit;
        }
      }
      
      if (project_limit === undefined) {
        updates.project_limit = tierConfig.projectLimit;
      }
    }

    // Handle explicit values
    if (subscription_status !== undefined) updates.subscription_status = subscription_status;
    if (billing_period !== undefined) updates.billing_period = billing_period;
    if (payment_method !== undefined) updates.payment_method = payment_method;
    if (subscription_start_date !== undefined) updates.subscription_start_date = subscription_start_date;
    if (subscription_end_date !== undefined) updates.subscription_end_date = subscription_end_date;
    if (monthly_word_limit !== undefined) updates.monthly_word_limit = monthly_word_limit;
    if (extra_words_balance !== undefined) updates.extra_words_balance = extra_words_balance;
    if (project_limit !== undefined) updates.project_limit = project_limit;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    // Handle credit operations
    if (add_extra_credits && typeof add_extra_credits === "number") {
      updates.extra_words_balance = (currentProfile.extra_words_balance || 0) + add_extra_credits;
      logStep("Adding extra credits", { amount: add_extra_credits });
    }

    if (reset_credits === true) {
      updates.extra_words_balance = 0;
      logStep("Resetting credits to 0");
    }

    logStep("Updating profile", updates);

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("user_id", user_id);

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }
    logStep("Profile updated successfully");

    // Log admin activity
    await supabaseAdmin.from("admin_activity_logs").insert({
      admin_user_id: adminUserId,
      action: "update_subscription",
      entity_type: "user",
      entity_id: user_id,
      details: {
        changes: updates,
        previous_tier: currentProfile.subscription_tier,
        new_tier: subscription_tier || currentProfile.subscription_tier,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      user_id,
      updates,
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
