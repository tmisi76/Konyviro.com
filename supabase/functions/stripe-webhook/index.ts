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

// Tier configuration - monthly limits
const TIER_LIMITS: Record<string, { projectLimit: number; monthlyWordLimit: number; storybookLimit: number }> = {
  hobby: { projectLimit: 5, monthlyWordLimit: 100000, storybookLimit: 1 },
  writer: { projectLimit: 50, monthlyWordLimit: 250000, storybookLimit: 5 },
  pro: { projectLimit: -1, monthlyWordLimit: -1, storybookLimit: 999 },
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
        let userId = session.metadata?.supabase_user_id;
        const tier = session.metadata?.tier as string;
        const billingPeriod = session.metadata?.billing_period || "yearly";
        const isFounder = session.metadata?.is_founder === "true";

        logStep("Processing checkout.session.completed", { 
          userId, 
          tier, 
          billingPeriod, 
          isFounder,
          customerId: session.customer 
        });

        // GUEST CHECKOUT - Create new user
        if (!userId || userId === "guest") {
          const customerId = session.customer as string;
          logStep("Guest checkout detected, creating user", { customerId });
          
          try {
            const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
            
            if (!customer.deleted && customer.email) {
              logStep("Retrieved customer from Stripe", { 
                email: customer.email, 
                name: customer.name 
              });
              
              // Check if user already exists
              const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
              const existingUser = existingUsers?.users?.find(u => u.email === customer.email);
              
              if (existingUser) {
                userId = existingUser.id;
                logStep("User already exists", { userId, email: customer.email });
              } else {
                // Create new user with random password
                const tempPassword = crypto.randomUUID();
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                  email: customer.email,
                  password: tempPassword,
                  email_confirm: true,
                  user_metadata: {
                    full_name: customer.name || "",
                  },
                });
                
                if (authError) {
                  logStep("ERROR creating user", { error: authError.message });
                  throw authError;
                }
                
                if (authData.user) {
                  userId = authData.user.id;
                  logStep("New user created", { userId, email: customer.email });
                  
                  // Send password reset email so user can set their password
                  const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
                    type: "recovery",
                    email: customer.email,
                    options: {
                      redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovableproject.com')}/auth?mode=reset`,
                    },
                  });
                  
                  if (resetError) {
                    logStep("Warning: Failed to send password reset email", { error: resetError.message });
                  } else {
                    logStep("Password reset email sent", { email: customer.email });
                  }
                }
              }
            } else {
              logStep("ERROR: Customer has no email or is deleted");
              break;
            }
          } catch (customerError) {
            logStep("ERROR retrieving/creating customer", { error: String(customerError) });
            break;
          }
        }

        if (!userId || !tier) {
          logStep("ERROR: Missing user_id or tier after processing");
          break;
        }

        // Calculate limits based on tier
        const limits = TIER_LIMITS[tier] || TIER_LIMITS.hobby;
        
        // Calculate credits based on billing period
        let monthlyWordLimit = limits.monthlyWordLimit;
        let extraWordsBalance = 0;
        
        if (billingPeriod === "yearly" && tier !== "free") {
          // Yearly: 12 months of credits upfront in extra_words_balance
          monthlyWordLimit = 0;
          extraWordsBalance = limits.monthlyWordLimit * 12;
          logStep("Yearly subscription - credits calculated", { 
            monthlyWordLimit, 
            extraWordsBalance 
          });
        } else {
          // Monthly: standard monthly limit
          logStep("Monthly subscription - limits set", { monthlyWordLimit });
        }

        // Calculate subscription end date
        const subscriptionEndDate = new Date();
        if (billingPeriod === "yearly") {
          subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
        } else {
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
        }

        // Upsert profile (create or update)
        const profileData = {
          user_id: userId,
          subscription_tier: tier,
          subscription_status: "active",
          billing_period: billingPeriod,
          is_founder: isFounder,
          founder_discount_applied: isFounder,
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: subscriptionEndDate.toISOString(),
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          project_limit: limits.projectLimit,
          monthly_word_limit: monthlyWordLimit,
          extra_words_balance: extraWordsBalance,
          storybook_credit_limit: limits.storybookLimit,
          storybook_credits_used: 0,
          last_credit_reset: new Date().toISOString(),
        };

        logStep("Upserting profile", profileData);

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .upsert(profileData, { onConflict: "user_id" });

        if (updateError) {
          logStep("ERROR updating profile", { error: updateError.message });
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
            logStep("Founder spot incremented");
          }
        }

        logStep("Subscription activated successfully", { 
          userId, 
          tier, 
          billingPeriod,
          monthlyWordLimit,
          extraWordsBalance,
          isFounder 
        });
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

        if (!targetUserId || targetUserId === "guest") {
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

        if (!deletedUserId || deletedUserId === "guest") {
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
            extra_words_balance: 0,
            storybook_credit_limit: 0,
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
