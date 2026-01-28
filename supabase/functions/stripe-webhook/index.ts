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
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

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
                  
                  // Generate password reset link so user can set their password
                  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                    type: "recovery",
                    email: customer.email,
                    options: {
                      redirectTo: "https://konyviro.com/auth?mode=set-password",
                    },
                  });
                  
                  if (linkError) {
                    logStep("Warning: Failed to generate password link", { error: linkError.message });
                  }
                  
                  // Send welcome email with password setup link
                  const resendKey = Deno.env.get("RESEND_API_KEY");
                  if (resendKey) {
                    const tierNames: Record<string, string> = {
                      hobby: "Hobbi",
                      writer: "Író",
                      pro: "Profi"
                    };
                    const periodNames: Record<string, string> = {
                      monthly: "havi",
                      yearly: "éves"
                    };
                    
                    const passwordLink = linkData?.properties?.action_link || "https://konyviro.com/auth";
                    const tierDisplay = tierNames[tier] || tier;
                    const periodDisplay = periodNames[billingPeriod] || billingPeriod;
                    const limits = TIER_LIMITS[tier] || TIER_LIMITS.hobby;
                    const credits = billingPeriod === "yearly" ? limits.monthlyWordLimit * 12 : limits.monthlyWordLimit;
                    
                    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🎉 Üdvözlünk a KönyvÍró-nál!</h1>
    </div>
    
    <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 18px; color: #1e293b; margin: 0 0 20px;">Kedves <strong>${customer.name || "Felhasználó"}</strong>!</p>
      
      <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
        Köszönjük, hogy előfizettél a KönyvÍró-ra! Fiókod elkészült, már csak be kell állítanod a jelszavad.
      </p>
      
      <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 24px; margin: 0 0 30px; border: 1px solid #e9d5ff;">
        <h3 style="color: #7c3aed; margin: 0 0 16px; font-size: 16px;">📦 Előfizetésed részletei</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Csomag:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${tierDisplay} (${periodDisplay})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email cím:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${customer.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Szó kredit:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${credits.toLocaleString()} szó</td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${passwordLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Jelszó beállítása →
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; text-align: center; margin: 20px 0;">
        Ha a gomb nem működik, másold be ezt a linket a böngésződbe:<br>
        <a href="${passwordLink}" style="color: #7c3aed; word-break: break-all;">${passwordLink}</a>
      </p>
      
      <p style="font-size: 14px; color: #94a3b8; text-align: center; margin: 30px 0 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        Ha bármilyen kérdésed van, írj nekünk!<br>
        <strong style="color: #7c3aed;">A KönyvÍró csapata</strong>
      </p>
    </div>
  </div>
</body>
</html>`;

                    try {
                      const emailRes = await fetch("https://api.resend.com/emails", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${resendKey}`,
                        },
                        body: JSON.stringify({
                          from: "KönyvÍró <noreply@digitalisbirodalom.hu>",
                          to: [customer.email],
                          subject: "🎉 Üdvözlünk a KönyvÍró-nál! Állítsd be a jelszavad",
                          html: emailHtml,
                        }),
                      });

                      if (emailRes.ok) {
                        logStep("Welcome email sent successfully", { email: customer.email });
                      } else {
                        const errorText = await emailRes.text();
                        logStep("Welcome email failed", { error: errorText });
                      }
                    } catch (emailError) {
                      logStep("Email error", { error: String(emailError) });
                    }
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

        logStep("Updating profile", profileData);

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(profileData)
          .eq("user_id", userId);

        if (updateError) {
          logStep("CRITICAL ERROR: Failed to update user profile", { 
            userId, 
            error: updateError.message,
            code: updateError.code 
          });
          return new Response(
            JSON.stringify({ error: "Failed to update user profile after creation." }),
            { 
              status: 500, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
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
