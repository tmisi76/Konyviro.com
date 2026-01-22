import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe price IDs to subscription tiers (yearly and monthly)
const PRICE_TO_TIER: Record<string, string> = {
  // Yearly prices
  "price_1Ss3QZBqXALGTPIr0z2uRD0a": "hobby",
  "price_1Ss3QbBqXALGTPIrjbB9lSCI": "writer",
  "price_1Ss3QcBqXALGTPIrStgzIXPu": "pro",
  // Monthly prices
  "price_1Ss8bGBqXALGTPIrOVHTHBPA": "hobby",
  "price_1Ss8bHBqXALGTPIrEmUEe1Gw": "writer",
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
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: "free",
        subscription_end: null,
        cancel_at_period_end: false,
        card_last4: null,
        card_brand: null,
        card_exp_month: null,
        card_exp_year: null,
        invoices: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
      expand: ["data.default_payment_method"],
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let tier = "free";
    let subscriptionEnd = null;
    let subscriptionStart = null;
    let cancelAtPeriodEnd = false;
    let cardLast4 = null;
    let cardBrand = null;
    let cardExpMonth = null;
    let cardExpYear = null;
    let billingInterval: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      subscriptionStart = new Date(subscription.current_period_start * 1000).toISOString();
      cancelAtPeriodEnd = subscription.cancel_at_period_end;
      
      const price = subscription.items.data[0].price;
      const priceId = price.id;
      tier = PRICE_TO_TIER[priceId] || "hobby";
      
      // Get billing interval from price
      billingInterval = price.recurring?.interval || "year";
      
      logStep("Active subscription found", { subscriptionId: subscription.id, tier, billingInterval, endDate: subscriptionEnd });

      // Get payment method details
      const paymentMethod = subscription.default_payment_method;
      if (paymentMethod && typeof paymentMethod === "object" && paymentMethod.card) {
        cardLast4 = paymentMethod.card.last4;
        cardBrand = paymentMethod.card.brand;
        cardExpMonth = paymentMethod.card.exp_month;
        cardExpYear = paymentMethod.card.exp_year;
      }
    } else {
      logStep("No active subscription found");
    }

    // Get recent invoices (may fail with restricted keys lacking invoice permissions)
    let invoiceData: Array<{
      id: string;
      date: string;
      description: string;
      amount: number;
      currency: string;
      status: string | null;
      invoice_pdf: string | null;
      hosted_invoice_url: string | null;
    }> = [];
    
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 10,
      });

      invoiceData = invoices.data.map((inv: Stripe.Invoice) => ({
        id: inv.id,
        date: new Date(inv.created * 1000).toISOString(),
        description: inv.lines.data[0]?.description || "Előfizetés",
        amount: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        invoice_pdf: inv.invoice_pdf,
        hosted_invoice_url: inv.hosted_invoice_url,
      }));
      logStep("Invoices fetched", { count: invoiceData.length });
    } catch (invoiceError) {
      // Restricted API keys may lack invoice read permissions - continue without invoices
      logStep("Could not fetch invoices (permission issue)", { 
        error: invoiceError instanceof Error ? invoiceError.message : String(invoiceError) 
      });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      tier,
      subscription_start: subscriptionStart,
      subscription_end: subscriptionEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      card_last4: cardLast4,
      card_brand: cardBrand,
      card_exp_month: cardExpMonth,
      card_exp_year: cardExpYear,
      billing_interval: billingInterval,
      invoices: invoiceData,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
