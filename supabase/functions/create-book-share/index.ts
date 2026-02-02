import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate a secure random token for share URL
function generateShareToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use anon key client to verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      projectId, 
      password, 
      isPublic = true, 
      viewMode = "scroll", 
      allowDownload = false,
      expiresAt = null 
    } = await req.json();

    if (!projectId || typeof projectId !== "string") {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (project.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You do not own this project" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if share already exists for this project
    const { data: existingShare } = await supabase
      .from("book_shares")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingShare) {
      return new Response(
        JSON.stringify({ error: "Share already exists for this project" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate share token
    const shareToken = generateShareToken();

    // Hash password with bcrypt if provided
    let passwordHash: string | null = null;
    if (password && typeof password === "string" && password.length > 0) {
      passwordHash = await bcrypt.hash(password);
    }

    // Create the share
    const { data: share, error: createError } = await supabase
      .from("book_shares")
      .insert({
        project_id: projectId,
        user_id: user.id,
        share_token: shareToken,
        is_public: isPublic,
        password_hash: passwordHash,
        view_mode: viewMode,
        allow_download: allowDownload,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (createError) {
      console.error("Failed to create share:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create share" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return share without password_hash
    const { password_hash: _, ...safeShare } = share;
    return new Response(
      JSON.stringify({ 
        share: {
          ...safeShare,
          requires_password: passwordHash !== null
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-book-share:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
