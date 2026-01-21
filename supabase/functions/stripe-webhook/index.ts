import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log(`Processing webhook event: ${event.type}`);

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

        console.log(`Successfully activated ${tier} subscription for user ${userId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          console.error("Missing user_id in subscription metadata");
          break;
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
          .eq("user_id", userId);

        console.log(`Updated subscription status to ${status} for user ${userId}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          console.error("Missing user_id in subscription metadata");
          break;
        }

        // Reset to free tier
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "expired",
            subscription_end_date: new Date().toISOString(),
            project_limit: 1,
            monthly_word_limit: 5000,
          })
          .eq("user_id", userId);

        console.log(`Subscription expired for user ${userId}`);
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

          console.log(`Payment failed for user ${profile.user_id}`);
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
