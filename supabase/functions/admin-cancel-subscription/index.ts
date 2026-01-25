import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const adminUser = userData.user;
    if (!adminUser) throw new Error("User not authenticated");

    // Check admin role
    const { data: adminData, error: adminError } = await supabaseClient
      .from("admin_users")
      .select("role, is_active")
      .eq("user_id", adminUser.id)
      .single();

    if (adminError || !adminData?.is_active) {
      throw new Error("Not authorized - admin access required");
    }
    logStep("Admin authenticated", { adminId: adminUser.id, role: adminData.role });

    const { userId, cancelImmediately = false } = await req.json();
    if (!userId) throw new Error("userId is required");
    logStep("Request params", { userId, cancelImmediately });

    // Get user's profile to find Stripe subscription
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, user_id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    if (!profile.stripe_subscription_id) {
      throw new Error("No active subscription found for this user");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    let cancelledSubscription;

    if (cancelImmediately) {
      cancelledSubscription = await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      logStep("Subscription cancelled immediately", { subscriptionId: profile.stripe_subscription_id });

      // Update profile to free tier
      await supabaseClient
        .from("profiles")
        .update({
          subscription_tier: "free",
          subscription_status: "cancelled",
          subscription_end_date: new Date().toISOString(),
          project_limit: 1,
          monthly_word_limit: 1000,
          stripe_subscription_id: null,
        })
        .eq("user_id", userId);
    } else {
      cancelledSubscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      logStep("Subscription set to cancel at period end");
    }

    // Log admin action
    await supabaseClient
      .from("admin_activity_logs")
      .insert({
        admin_user_id: adminData.role ? adminUser.id : null,
        action: cancelImmediately ? "subscription_cancelled_immediately" : "subscription_cancel_scheduled",
        entity_type: "subscription",
        entity_id: userId,
        details: {
          stripe_subscription_id: profile.stripe_subscription_id,
          cancel_at_period_end: !cancelImmediately,
        },
      });

    return new Response(JSON.stringify({ 
      success: true,
      cancelAtPeriodEnd: !cancelImmediately,
      currentPeriodEnd: cancelledSubscription.current_period_end 
        ? new Date(cancelledSubscription.current_period_end * 1000).toISOString()
        : null,
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
