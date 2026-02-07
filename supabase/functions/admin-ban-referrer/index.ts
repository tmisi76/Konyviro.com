import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BanRequest {
  referrer_id: string;
  ban_referrer: boolean;
  ban_referred_ids: string[];
  reason: string;
  revoke_bonus?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super_admin status (only super admins can ban)
    const { data: adminUser } = await supabaseClient
      .from("admin_users")
      .select("role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!adminUser || adminUser.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Only super admins can ban users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: BanRequest = await req.json();
    const { referrer_id, ban_referrer, ban_referred_ids, reason, revoke_bonus } = body;

    if (!referrer_id || !reason) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bannedUsers: string[] = [];
    const errors: string[] = [];
    const now = new Date().toISOString();

    // Ban the referrer if requested
    if (ban_referrer) {
      try {
        // Update profile
        await supabaseClient
          .from("profiles")
          .update({
            referral_banned: true,
            referral_ban_reason: reason,
            subscription_status: "banned",
          })
          .eq("user_id", referrer_id);

        // Ban in auth
        await supabaseClient.auth.admin.updateUserById(referrer_id, {
          ban_duration: "876000h", // ~100 years
        });

        // Revoke bonus if requested
        if (revoke_bonus) {
          await supabaseClient
            .from("profiles")
            .update({ extra_words_balance: 0 })
            .eq("user_id", referrer_id);
        }

        bannedUsers.push(referrer_id);
      } catch (err) {
        errors.push(`Failed to ban referrer: ${err.message}`);
      }
    }

    // Ban referred users
    for (const referredId of ban_referred_ids) {
      try {
        // Update profile
        await supabaseClient
          .from("profiles")
          .update({ subscription_status: "banned" })
          .eq("user_id", referredId);

        // Ban in auth
        await supabaseClient.auth.admin.updateUserById(referredId, {
          ban_duration: "876000h",
        });

        // Revoke bonus if requested
        if (revoke_bonus) {
          await supabaseClient
            .from("profiles")
            .update({ extra_words_balance: 0 })
            .eq("user_id", referredId);
        }

        // Mark referral as fraud
        await supabaseClient
          .from("referrals")
          .update({
            is_fraud: true,
            fraud_reason: reason,
            banned_at: now,
          })
          .eq("referred_id", referredId);

        bannedUsers.push(referredId);
      } catch (err) {
        errors.push(`Failed to ban ${referredId}: ${err.message}`);
      }
    }

    // Log the action
    await supabaseClient.from("admin_activity_logs").insert({
      admin_user_id: adminUser ? user.id : null,
      action: "ban_affiliate_fraud",
      entity_type: "referral",
      entity_id: referrer_id,
      details: {
        referrer_id,
        ban_referrer,
        banned_referred_count: ban_referred_ids.length,
        reason,
        revoke_bonus,
        banned_users: bannedUsers,
        errors,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        banned_count: bannedUsers.length,
        banned_users: bannedUsers,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
