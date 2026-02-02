import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      shareId,
      password, // undefined = no change, null = remove, string = set new
      isPublic, 
      viewMode, 
      allowDownload,
      expiresAt 
    } = await req.json();

    if (!shareId || typeof shareId !== "string") {
      return new Response(
        JSON.stringify({ error: "Share ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns the share
    const { data: existingShare, error: shareError } = await supabase
      .from("book_shares")
      .select("id, user_id")
      .eq("id", shareId)
      .single();

    if (shareError || !existingShare) {
      return new Response(
        JSON.stringify({ error: "Share not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingShare.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You do not own this share" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Handle password update
    if (password !== undefined) {
      if (password === null) {
        // Remove password
        updateData.password_hash = null;
      } else if (typeof password === "string" && password.length > 0) {
        // Set new password with bcrypt
        updateData.password_hash = await bcrypt.hash(password);
      }
    }

    if (isPublic !== undefined) updateData.is_public = isPublic;
    if (viewMode !== undefined) updateData.view_mode = viewMode;
    if (allowDownload !== undefined) updateData.allow_download = allowDownload;
    if (expiresAt !== undefined) updateData.expires_at = expiresAt;

    // Update the share
    const { data: share, error: updateError } = await supabase
      .from("book_shares")
      .update(updateData)
      .eq("id", shareId)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update share:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update share" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return share without password_hash
    const { password_hash, ...safeShare } = share;
    return new Response(
      JSON.stringify({ 
        share: {
          ...safeShare,
          requires_password: password_hash !== null
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-book-share:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
