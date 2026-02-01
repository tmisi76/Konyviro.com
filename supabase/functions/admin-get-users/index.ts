import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_period: string | null;
  projects_count: number;
  created_at: string;
  is_founder: boolean;
  status: 'active' | 'inactive' | 'banned';
}

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

    // Check if user is admin using service role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: adminCheck } = await serviceClient
      .from("admin_users")
      .select("id, role")
      .eq("user_id", claimsData.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "all";
    const plan = url.searchParams.get("plan") || "all";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    // Fetch all auth users with service role
    const { data: authUsers, error: authError } = await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return new Response(JSON.stringify({ error: "Failed to fetch users" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create email lookup map
    const emailMap: Record<string, string> = {};
    authUsers.users.forEach((user) => {
      emailMap[user.id] = user.email || "";
    });

    // Fetch profiles
    const { data: profiles, error: profilesError } = await serviceClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(JSON.stringify({ error: "Failed to fetch profiles" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project counts
    const { data: projects } = await serviceClient
      .from("projects")
      .select("user_id");

    const projectCounts: Record<string, number> = {};
    projects?.forEach((p) => {
      projectCounts[p.user_id] = (projectCounts[p.user_id] || 0) + 1;
    });

    // Derive user status from subscription_status
    const deriveStatus = (subscriptionStatus: string): 'active' | 'inactive' | 'banned' => {
      if (subscriptionStatus === 'banned') return 'banned';
      if (subscriptionStatus === 'active') return 'active';
      return 'inactive';
    };

    // Map profiles to admin users with emails
    let users: AdminUser[] = (profiles || []).map((profile) => ({
      id: profile.id,
      user_id: profile.user_id,
      email: emailMap[profile.user_id] || "",
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      subscription_tier: profile.subscription_tier || "free",
      subscription_status: profile.subscription_status || "active",
      stripe_customer_id: profile.stripe_customer_id,
      stripe_subscription_id: profile.stripe_subscription_id,
      billing_period: profile.billing_period,
      projects_count: projectCounts[profile.user_id] || 0,
      created_at: profile.created_at,
      is_founder: profile.is_founder || false,
      status: deriveStatus(profile.subscription_status || "active"),
    }));

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(searchLower) ||
          (u.full_name?.toLowerCase() || "").includes(searchLower)
      );
    }

    // Apply plan filter
    if (plan !== "all") {
      users = users.filter((u) => u.subscription_tier === plan);
    }

    // Apply status filter (server-side)
    if (status !== "all") {
      users = users.filter((u) => u.status === status);
    }

    // Calculate pagination
    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    const from = (page - 1) * limit;
    const paginatedUsers = users.slice(from, from + limit);

    return new Response(
      JSON.stringify({
        data: paginatedUsers,
        total,
        totalPages,
        page,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in admin-get-users:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
