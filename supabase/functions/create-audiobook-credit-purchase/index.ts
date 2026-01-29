import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Credit packages
const PACKAGES: Record<string, { minutes: number; priceHuf: number }> = {
  audiobook_30: { minutes: 30, priceHuf: 9990 },
  audiobook_100: { minutes: 100, priceHuf: 29990 },
  audiobook_250: { minutes: 250, priceHuf: 69990 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packageId } = await req.json();

    if (!packageId || !PACKAGES[packageId]) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen csomag" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedPackage = PACKAGES[packageId];

    // Get user from auth header
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Nincs bejelentkezve" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: `Hangoskönyv kredit - ${selectedPackage.minutes} perc`,
              description: `${selectedPackage.minutes} perc hangoskönyv generálás`,
            },
            unit_amount: selectedPackage.priceHuf * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/dashboard?audiobook_purchase=success`,
      cancel_url: `${req.headers.get("origin")}/dashboard?audiobook_purchase=cancelled`,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        minutes_purchased: selectedPackage.minutes.toString(),
        purchase_type: "audiobook_credits",
      },
    });

    // Create pending purchase record
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    await supabaseAdmin.from("audiobook_credit_purchases").insert({
      user_id: user.id,
      stripe_session_id: session.id,
      minutes_purchased: selectedPackage.minutes,
      amount: selectedPackage.priceHuf,
      status: "pending",
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error creating audiobook credit purchase:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
