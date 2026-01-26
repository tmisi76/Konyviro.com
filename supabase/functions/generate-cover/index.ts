import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COVER_GENERATION_COST = 2000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Create service role client for RPC calls
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    const { projectId, prompt, style, title, author } = await req.json();

    if (!projectId || !prompt || !style) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: projectId, prompt, style" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabaseClient
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

    if (project.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user credits
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("monthly_word_limit, extra_words_balance")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usageData } = await supabaseAdmin
      .from("user_usage")
      .select("words_generated")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .maybeSingle();

    const monthlyLimit = profile.monthly_word_limit || 5000;
    const wordsUsed = usageData?.words_generated || 0;
    const extraBalance = profile.extra_words_balance || 0;

    // Unlimited plan check
    if (monthlyLimit !== -1) {
      const remainingMonthly = Math.max(0, monthlyLimit - wordsUsed);
      const totalAvailable = remainingMonthly + extraBalance;

      if (totalAvailable < COVER_GENERATION_COST) {
        return new Response(
          JSON.stringify({ 
            error: "Nincs elég kredit. A borító generálás 2000 szó kreditet igényel. Vásárolj extra kreditet vagy válts nagyobb csomagra.",
            code: "INSUFFICIENT_CREDITS"
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // 1. Call Lovable AI Gateway (Nano Banana Pro = gemini-3-pro-image-preview)
    const fullPrompt = `Create a professional book cover for a ${style} novel. 
Title: "${title || "Untitled"}"
Author: "${author || "Unknown Author"}"
Style: ${style}
Description: ${prompt}

The cover should be vertical (portrait orientation), suitable for a book. Include the title prominently and the author name. Make it visually striking and genre-appropriate.`;

    console.log("Generating cover with prompt:", fullPrompt.substring(0, 200) + "...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          { role: "user", content: fullPrompt }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(aiData).substring(0, 500));
      throw new Error("No image generated");
    }

    // 2. Extract base64 data and upload to Supabase Storage
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid image data format");
    }

    const imageFormat = base64Match[1];
    const base64Data = base64Match[2];
    
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const imagePath = `covers/${projectId}/${Date.now()}.${imageFormat}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("project-assets")
      .upload(imagePath, bytes, {
        contentType: `image/${imageFormat}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: urlData } = supabaseClient.storage
      .from("project-assets")
      .getPublicUrl(imagePath);

    const publicUrl = urlData.publicUrl;
    console.log("Image uploaded to:", publicUrl);

    // 3. Create record in `covers` table
    const { data: coverRecord, error: insertError } = await supabaseClient
      .from("covers")
      .insert({
        project_id: projectId,
        prompt: prompt,
        style: style,
        image_url: publicUrl,
        is_selected: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save cover: ${insertError.message}`);
    }

    console.log("Cover created:", coverRecord.id);

    // Deduct credits after successful generation
    if (monthlyLimit === -1) {
      // Unlimited plan - still track usage for analytics
      await supabaseAdmin.rpc("increment_words_generated", {
        p_user_id: userId,
        p_word_count: COVER_GENERATION_COST,
      });
    } else {
      const remainingMonthly = Math.max(0, monthlyLimit - wordsUsed);
      
      if (COVER_GENERATION_COST <= remainingMonthly) {
        // Deduct from monthly quota
        await supabaseAdmin.rpc("increment_words_generated", {
          p_user_id: userId,
          p_word_count: COVER_GENERATION_COST,
        });
      } else {
        // Mixed: use remaining monthly + extra credits
        if (remainingMonthly > 0) {
          await supabaseAdmin.rpc("increment_words_generated", {
            p_user_id: userId,
            p_word_count: remainingMonthly,
          });
        }
        const fromExtra = COVER_GENERATION_COST - remainingMonthly;
        if (fromExtra > 0) {
          await supabaseAdmin.rpc("use_extra_credits", {
            p_user_id: userId,
            p_word_count: fromExtra,
          });
        }
      }
    }

    console.log("Credits deducted:", COVER_GENERATION_COST);

    return new Response(
      JSON.stringify({ ...coverRecord, credits_used: COVER_GENERATION_COST }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate cover error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
