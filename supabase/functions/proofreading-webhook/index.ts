import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("No stripe-signature header");
    return new Response("No signature", { status: 400 });
  }

  const webhookSecret = Deno.env.get("STRIPE_PROOFREADING_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("STRIPE_PROOFREADING_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    // Use async version for Deno compatibility
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : "Unknown"}`, {
      status: 400,
    });
  }

  console.log("Received webhook event:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Verify this is a proofreading purchase
    if (session.metadata?.type !== "proofreading") {
      console.log("Not a proofreading purchase, skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    try {
      // Update order status to paid
      const { data: order, error: updateError } = await supabaseAdmin
        .from("proofreading_orders")
        .update({ 
          status: "paid",
          started_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to update order:", updateError);
        return new Response("Failed to update order", { status: 500 });
      }

      console.log("Order updated to paid:", order.id);

      // Start proofreading process asynchronously
      const processUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-proofreading`;
      
      fetch(processUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      }).catch((err) => {
        console.error("Failed to trigger proofreading process:", err);
      });

      console.log("Proofreading process triggered for order:", order.id);

    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Internal error", { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
