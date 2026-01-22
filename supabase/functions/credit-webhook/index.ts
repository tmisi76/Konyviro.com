import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_CREDIT_WEBHOOK_SECRET");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    
    let event: Stripe.Event;
    
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // In development, parse without verification
      event = JSON.parse(body) as Stripe.Event;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process one-time payments (not subscriptions)
      if (session.mode !== "payment") {
        return new Response("Not a payment session", { status: 200 });
      }

      const userId = session.metadata?.user_id;
      const wordsPurchased = parseInt(session.metadata?.words_purchased || "0", 10);
      const amountPaid = session.amount_total ? session.amount_total / 100 : 0;

      if (!userId || !wordsPurchased) {
        console.error("Missing metadata:", session.metadata);
        return new Response("Missing metadata", { status: 400 });
      }

      console.log(`Adding ${wordsPurchased} credits for user ${userId}`);

      // Add credits to user's balance
      const { error: creditError } = await supabaseAdmin.rpc("add_extra_credits", {
        p_user_id: userId,
        p_word_count: wordsPurchased,
      });

      if (creditError) {
        console.error("Error adding credits:", creditError);
        throw creditError;
      }

      // Get updated balance and user email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("extra_words_balance")
        .eq("user_id", userId)
        .single();

      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const userEmail = userData?.user?.email;

      // Update purchase record
      const { error: updateError } = await supabaseAdmin
        .from("credit_purchases")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

      if (updateError) {
        console.error("Error updating purchase record:", updateError);
      }

      // Send confirmation email
      if (userEmail) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-credit-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              email: userEmail,
              wordsPurchased,
              amountPaid,
              newBalance: profile?.extra_words_balance || wordsPurchased,
            }),
          });
          console.log("Credit email sent to:", userEmail);
        } catch (emailError) {
          console.error("Failed to send credit email:", emailError);
        }
      }

      console.log(`Successfully added ${wordsPurchased} credits for user ${userId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400 }
    );
  }
});
