import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tier configuration
const TIER_LIMITS: Record<string, { projectLimit: number; monthlyWordLimit: number }> = {
  hobby: { projectLimit: 1, monthlyWordLimit: 50000 },
  writer: { projectLimit: 5, monthlyWordLimit: 200000 },
  pro: { projectLimit: -1, monthlyWordLimit: -1 }, // -1 means unlimited
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("Webhook received");

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logStep("ERROR: STRIPE_SECRET_KEY not set");
    return new Response("Server configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature) {
    logStep("ERROR: Missing stripe-signature header");
    return new Response("Missing signature", { status: 400 });
  }
  
  if (!webhookSecret) {
    logStep("ERROR: STRIPE_WEBHOOK_SECRET not set");
    return new Response("Server configuration error", { status: 500 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    logStep("Event verified", { type: event.type, id: event.id });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const tier = session.metadata?.tier as string;
        const isFounder = session.metadata?.is_founder === "true";

        if (!userId || !tier) {
          console.error("Missing user_id or tier in session metadata");
          break;
        }

        const limits = TIER_LIMITS[tier] || TIER_LIMITS.hobby;
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);

        // Update user profile
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: tier,
            subscription_status: "active",
            is_founder: isFounder,
            founder_discount_applied: isFounder,
            subscription_start_date: new Date().toISOString(),
            subscription_end_date: subscriptionEndDate.toISOString(),
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            project_limit: limits.projectLimit,
            monthly_word_limit: limits.monthlyWordLimit,
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error updating profile:", updateError);
          throw updateError;
        }

        // Increment founder spots if this is a founder subscription
        if (isFounder) {
          const { data: spots, error: spotsError } = await supabaseAdmin
            .from("founder_spots")
            .select("id, spots_taken")
            .single();

          if (!spotsError && spots) {
            await supabaseAdmin
              .from("founder_spots")
              .update({ spots_taken: spots.spots_taken + 1 })
              .eq("id", spots.id);
          }
        }

        logStep("Subscription activated", { userId, tier, isFounder });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription update", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end 
        });
        
        let targetUserId = subscription.metadata?.supabase_user_id;

        if (!targetUserId) {
          // Try to find user by customer id
          const customerId = subscription.customer as string;
          logStep("No user_id in metadata, looking up by customer", { customerId });
          
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .single();
          
          if (!profile) {
            logStep("Could not find user for subscription");
            break;
          }
          
          targetUserId = profile.user_id;
        }

        let status: string;
        switch (subscription.status) {
          case "active":
            status = "active";
            break;
          case "past_due":
            status = "past_due";
            break;
          case "canceled":
            status = "cancelled";
            break;
          default:
            status = "active";
        }

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: status,
            subscription_end_date: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq("user_id", targetUserId);

        logStep("Subscription status updated", { userId: targetUserId, status });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let deletedUserId = subscription.metadata?.supabase_user_id;

        if (!deletedUserId) {
          const customerId = subscription.customer as string;
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .single();
          
          if (!profile) {
            logStep("Could not find user for deleted subscription");
            break;
          }
          deletedUserId = profile.user_id;
        }

        // Reset to free tier
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "expired",
            subscription_end_date: new Date().toISOString(),
            project_limit: 1,
            monthly_word_limit: 1000,
            stripe_subscription_id: null,
          })
          .eq("user_id", deletedUserId);

        logStep("Subscription expired, reset to free tier", { userId: deletedUserId });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by stripe customer id
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({ subscription_status: "past_due" })
            .eq("user_id", profile.user_id);

          logStep("Payment failed, status set to past_due", { userId: profile.user_id });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
