import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_AUDIOBOOK_WEBHOOK_SECRET");

  // If no dedicated secret, fall back to the general credit webhook secret
  const activeSecret = webhookSecret || Deno.env.get("STRIPE_CREDIT_WEBHOOK_SECRET");

  if (!signature || !activeSecret) {
    console.error("Missing signature or webhook secret");
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, activeSecret);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Only process audiobook credit purchases
      if (session.metadata?.purchase_type !== "audiobook_credits") {
        console.log("Not an audiobook credit purchase, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      const userId = session.metadata?.user_id;
      const minutesPurchased = parseInt(session.metadata?.minutes_purchased || "0", 10);

      if (!userId || !minutesPurchased) {
        console.error("Missing metadata:", session.metadata);
        return new Response("Missing metadata", { status: 400 });
      }

      console.log(`Adding ${minutesPurchased} audiobook minutes for user ${userId}`);

      // Add minutes to user's balance
      const { error: creditError } = await supabaseAdmin.rpc("add_audiobook_minutes_internal", {
        p_user_id: userId,
        p_minutes: minutesPurchased,
      });

      if (creditError) {
        console.error("Error adding audiobook minutes:", creditError);
        throw creditError;
      }

      // Update purchase record
      const { error: updateError } = await supabaseAdmin
        .from("audiobook_credit_purchases")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

      if (updateError) {
        console.error("Error updating purchase record:", updateError);
      }

      console.log(`Successfully added ${minutesPurchased} audiobook minutes for user ${userId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 400 });
  }
});
