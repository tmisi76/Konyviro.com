import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPLY-RETENTION-DISCOUNT] ${step}${detailsStr}`);
};

// Retention offer configuration
const DISCOUNT_PERCENT = 30;
const DISCOUNT_DURATION_MONTHS = 3;

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user profile to check eligibility
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("subscription_tier, subscription_status, retention_discount_active, retention_offer_shown_at, stripe_subscription_id")
      .eq("user_id", user.id)
      .single();

    if (profileError) throw new Error(`Profile fetch error: ${profileError.message}`);

    // Verify eligibility
    if (profile.retention_discount_active) {
      throw new Error("Retention discount already active");
    }

    // Check if offer was shown within last 24 hours (valid offer window)
    if (profile.retention_offer_shown_at) {
      const shownAt = new Date(profile.retention_offer_shown_at);
      const validUntil = new Date(shownAt);
      validUntil.setHours(validUntil.getHours() + 24);
      
      if (new Date() > validUntil) {
        throw new Error("Retention offer has expired");
      }
    } else {
      throw new Error("No retention offer was shown to this user");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer's subscription
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found");
    }
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    const subscription = subscriptions.data[0];
    logStep("Found subscription", { subscriptionId: subscription.id });

    // Create a coupon for this retention offer
    const coupon = await stripe.coupons.create({
      percent_off: DISCOUNT_PERCENT,
      duration: "repeating",
      duration_in_months: DISCOUNT_DURATION_MONTHS,
      name: `Retention Offer - ${DISCOUNT_PERCENT}% kedvezmény ${DISCOUNT_DURATION_MONTHS} hónapra`,
      metadata: {
        user_id: user.id,
        type: "retention_offer"
      }
    });
    logStep("Created coupon", { couponId: coupon.id });

    // Apply the coupon to the subscription
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      coupon: coupon.id,
    });
    logStep("Applied coupon to subscription");

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + DISCOUNT_DURATION_MONTHS);

    // Update profile with retention discount info
    await supabaseClient
      .from("profiles")
      .update({
        retention_offer_accepted_at: new Date().toISOString(),
        retention_discount_active: true,
        retention_discount_expires_at: expiresAt.toISOString(),
      })
      .eq("user_id", user.id);

    logStep("Updated profile with retention discount info");

    return new Response(JSON.stringify({
      success: true,
      discountPercent: DISCOUNT_PERCENT,
      discountDurationMonths: DISCOUNT_DURATION_MONTHS,
      expiresAt: expiresAt.toISOString(),
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
