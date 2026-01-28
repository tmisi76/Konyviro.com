import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to check admin status
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminUserId = claimsData.user.id;

    // Check if user is admin using service role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: adminCheck } = await serviceClient
      .from("admin_users")
      .select("id, role")
      .eq("user_id", adminUserId)
      .eq("is_active", true)
      .maybeSingle();

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get request body
    const { user_id, action } = await req.json();

    if (!user_id || !action) {
      return new Response(JSON.stringify({ error: "user_id and action are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["ban", "unban"].includes(action)) {
      return new Response(JSON.stringify({ error: "action must be 'ban' or 'unban'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-ban
    if (user_id === adminUserId) {
      return new Response(JSON.stringify({ error: "Cannot ban your own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if target is also an admin
    const { data: targetAdmin } = await serviceClient
      .from("admin_users")
      .select("id")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .maybeSingle();

    if (targetAdmin && action === "ban") {
      return new Response(JSON.stringify({ error: "Cannot ban an admin user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user info for logging
    const { data: authUser } = await serviceClient.auth.admin.getUserById(user_id);
    const userEmail = authUser?.user?.email || "unknown";

    if (action === "ban") {
      // Ban user: update profile status and set auth ban_duration
      const { error: profileError } = await serviceClient
        .from("profiles")
        .update({ subscription_status: "banned" })
        .eq("user_id", user_id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update auth user ban status (ban until year 2100)
      const { error: authError } = await serviceClient.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h", // ~100 years
      });

      if (authError) {
        console.error("Error banning auth user:", authError);
        // Rollback profile update
        await serviceClient
          .from("profiles")
          .update({ subscription_status: "active" })
          .eq("user_id", user_id);
        
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Unban user: update profile status and remove auth ban
      const { error: profileError } = await serviceClient
        .from("profiles")
        .update({ subscription_status: "active" })
        .eq("user_id", user_id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Remove auth user ban
      const { error: authError } = await serviceClient.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });

      if (authError) {
        console.error("Error unbanning auth user:", authError);
      }
    }

    // Log the activity
    await serviceClient.from("admin_activity_logs").insert({
      admin_user_id: adminCheck.id,
      action: action === "ban" ? "user_banned" : "user_unbanned",
      entity_type: "user",
      entity_id: user_id,
      details: {
        user_email: userEmail,
        action: action,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: action === "ban" ? "User banned successfully" : "User unbanned successfully" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in admin-ban-user:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
