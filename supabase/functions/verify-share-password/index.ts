import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate a secure random session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shareToken, password } = await req.json();

    if (!shareToken || typeof shareToken !== "string") {
      return new Response(
        JSON.stringify({ error: "Share token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password || typeof password !== "string") {
      return new Response(
        JSON.stringify({ error: "Password is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to access the password hash
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the share with password hash (only accessible via service role)
    const { data: share, error: shareError } = await supabase
      .from("book_shares")
      .select("id, password_hash, expires_at, is_public")
      .eq("share_token", shareToken)
      .maybeSingle();

    if (shareError) {
      console.error("Database error:", shareError);
      return new Response(
        JSON.stringify({ error: "Failed to verify password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!share) {
      return new Response(
        JSON.stringify({ error: "Share not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if share has expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Share has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no password is set, anyone can access
    if (!share.password_hash) {
      return new Response(
        JSON.stringify({ verified: true, sessionToken: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the password using bcrypt
    let isValid = false;
    try {
      isValid = await bcrypt.compare(password, share.password_hash);
    } catch (bcryptError) {
      console.error("Bcrypt error:", bcryptError);
      // Fallback: check if it's an old SHA-256 hash (for backwards compatibility)
      // This allows migration from old hashes to new bcrypt hashes
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256Hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      
      if (sha256Hash === share.password_hash) {
        isValid = true;
        // Upgrade the hash to bcrypt for future verifications
        const bcryptHash = await bcrypt.hash(password);
        await supabase
          .from("book_shares")
          .update({ password_hash: bcryptHash })
          .eq("id", share.id);
      }
    }

    if (!isValid) {
      // Add a small delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 100));
      return new Response(
        JSON.stringify({ error: "Invalid password", verified: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Password is valid - create a session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Get client IP if available
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    // Store the session
    const { error: insertError } = await supabase
      .from("book_share_access")
      .insert({
        share_id: share.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: clientIp,
      });

    if (insertError) {
      console.error("Failed to create session:", insertError);
      // Still return success even if session storage fails
      // The client can re-verify if needed
    }

    return new Response(
      JSON.stringify({ 
        verified: true, 
        sessionToken,
        expiresAt: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-share-password:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
