import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get the authorization header (optional for guest checkout)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;

    // Try to get authenticated user if auth header exists
    if (authHeader) {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      
      if (!userError && userData?.user) {
        userId = userData.user.id;
        userEmail = userData.user.email || null;
        logStep("User authenticated", { userId, email: userEmail });
      }
    }

    logStep("Checkout mode", { authenticated: !!userId });

    const { priceId, tier, billingPeriod = "yearly", successUrl, cancelUrl } = await req.json();

    if (!priceId || !tier) {
      throw new Error("Missing required parameters");
    }

    logStep("Request params", { priceId, tier, billingPeriod });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    let customerId: string | undefined;

    // Check if customer already exists (only if we have an email)
    if (userEmail) {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing customer found", { customerId });
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            supabase_user_id: userId || "guest",
          },
        });
        customerId = customer.id;
        logStep("New customer created", { customerId });
      }
    }

    // Create checkout session with billing address and phone collection
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail || undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      billing_address_collection: "required",
      phone_number_collection: {
        enabled: true,
      },
      customer_creation: customerId ? undefined : "always",
      success_url: successUrl || `${req.headers.get("origin")}/dashboard?subscription=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/pricing?subscription=cancelled`,
      metadata: {
        supabase_user_id: userId || "guest",
        tier: tier,
        billing_period: billingPeriod,
        is_founder: "true",
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId || "guest",
          tier: tier,
          billing_period: billingPeriod,
          is_founder: "true",
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
