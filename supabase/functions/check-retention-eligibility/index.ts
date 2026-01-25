import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-RETENTION-ELIGIBILITY] ${step}${detailsStr}`);
};

// Retention offer configuration
const DISCOUNT_PERCENT = 30;
const DISCOUNT_DURATION_MONTHS = 3;
const OFFER_VALIDITY_HOURS = 24;
const COOLDOWN_MONTHS = 6; // Can't get another offer for 6 months after showing

// Price mapping for display
const TIER_PRICES: Record<string, number> = {
  hobby: 4990,
  writer: 14990,
  pro: 29990,
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("subscription_tier, subscription_status, retention_offer_shown_at, retention_offer_accepted_at, retention_discount_active, retention_discount_expires_at")
      .eq("user_id", user.id)
      .single();

    if (profileError) throw new Error(`Profile fetch error: ${profileError.message}`);
    logStep("Profile fetched", { tier: profile.subscription_tier, status: profile.subscription_status });

    // Check eligibility criteria
    const tier = profile.subscription_tier;
    const status = profile.subscription_status;

    // 1. Must have an active paid subscription
    if (!["hobby", "writer", "pro"].includes(tier) || status !== "active") {
      logStep("Not eligible: not a paid active subscription");
      return new Response(JSON.stringify({ 
        eligible: false, 
        reason: "no_active_subscription" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Check if retention discount is already active
    if (profile.retention_discount_active) {
      logStep("Not eligible: retention discount already active");
      return new Response(JSON.stringify({ 
        eligible: false, 
        reason: "discount_already_active",
        expiresAt: profile.retention_discount_expires_at
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Check cooldown period (6 months since last offer shown)
    if (profile.retention_offer_shown_at) {
      const lastShown = new Date(profile.retention_offer_shown_at);
      const cooldownEnd = new Date(lastShown);
      cooldownEnd.setMonth(cooldownEnd.getMonth() + COOLDOWN_MONTHS);
      
      if (new Date() < cooldownEnd) {
        logStep("Not eligible: still in cooldown period", { 
          lastShown: profile.retention_offer_shown_at,
          cooldownEnds: cooldownEnd.toISOString()
        });
        return new Response(JSON.stringify({ 
          eligible: false, 
          reason: "cooldown_period",
          cooldownEnds: cooldownEnd.toISOString()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // User is eligible!
    const currentPrice = TIER_PRICES[tier] || 0;
    const discountedPrice = Math.round(currentPrice * (1 - DISCOUNT_PERCENT / 100));

    logStep("User is eligible for retention offer", {
      tier,
      currentPrice,
      discountedPrice,
      discountPercent: DISCOUNT_PERCENT
    });

    // Update the retention_offer_shown_at timestamp
    await supabaseClient
      .from("profiles")
      .update({ retention_offer_shown_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({
      eligible: true,
      discountPercent: DISCOUNT_PERCENT,
      discountDurationMonths: DISCOUNT_DURATION_MONTHS,
      currentPrice,
      discountedPrice,
      offerExpiresInHours: OFFER_VALIDITY_HOURS,
      tier,
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
