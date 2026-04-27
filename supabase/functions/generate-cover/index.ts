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

    const { projectId, prompt, style, title, author, variations } = await req.json();
    const variationCount = Math.max(1, Math.min(3, Number(variations) || 1));

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
    const totalCost = COVER_GENERATION_COST * variationCount;
    if (monthlyLimit !== -1) {
      const remainingMonthly = Math.max(0, monthlyLimit - wordsUsed);
      const totalAvailable = remainingMonthly + extraBalance;

      if (totalAvailable < totalCost) {
        return new Response(
          JSON.stringify({ 
            error: `Nincs elég kredit. A művelet ${totalCost.toLocaleString()} szó kreditet igényel. Vásárolj extra kreditet vagy válts nagyobb csomagra.`,
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

    // Build per-variation style modifiers for diversity
    const VARIATION_MODIFIERS = [
      "illustrated artistic interpretation, painterly textures, rich color palette",
      "photorealistic cinematic composition, dramatic lighting, sharp focus",
      "minimalist typographic design, bold type hierarchy, clean negative space",
    ];

    const buildPrompt = (modifier: string) => `Create a professional, print-ready book cover for a ${style} book. 
Title: "${title || "Untitled"}"
Author: "${author || "Unknown Author"}"
Style: ${style}
Description: ${prompt}
Variation direction: ${modifier}

The cover MUST be vertical 2:3 portrait orientation, high-resolution (print-quality, 300 DPI feel, at least 2048x3072), with the title prominently displayed and the author name visible. No text artifacts, no watermarks, no borders. Visually striking and genre-appropriate.`;

    // Generate N variations in parallel
    const generateOne = async (modifier: string, idx: number) => {
      const fullPrompt = buildPrompt(modifier);
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: fullPrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`AI ${aiResponse.status}: ${errText.slice(0, 200)}`);
      }
      const aiData = await aiResponse.json();
      const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageData) throw new Error("No image generated");
      const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!base64Match) throw new Error("Invalid image data format");
      const imageFormat = base64Match[1];
      const binaryString = atob(base64Match[2]);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const imagePath = `covers/${projectId}/${Date.now()}_${idx}.${imageFormat}`;
      const { error: uploadError } = await supabaseClient.storage
        .from("project-assets")
        .upload(imagePath, bytes, { contentType: `image/${imageFormat}`, upsert: false });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      const { data: urlData } = supabaseClient.storage.from("project-assets").getPublicUrl(imagePath);
      const { data: coverRecord, error: insertError } = await supabaseClient
        .from("covers")
        .insert({
          project_id: projectId,
          prompt: `${prompt} [${modifier}]`,
          style: style,
          image_url: urlData.publicUrl,
          is_selected: false,
        })
        .select()
        .single();
      if (insertError) throw new Error(`Failed to save cover: ${insertError.message}`);
      return coverRecord;
    };

    const modifiers = VARIATION_MODIFIERS.slice(0, variationCount);
    const results = await Promise.allSettled(modifiers.map((m, i) => generateOne(m, i)));
    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);
    const failedCount = results.length - successful.length;

    if (successful.length === 0) {
      const firstErr = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      throw new Error(firstErr?.reason?.message || "All cover generations failed");
    }

    const actualCost = COVER_GENERATION_COST * successful.length;
    const coverRecord = successful[0]; // backward-compat single-cover response

    // Deduct credits after successful generation
    if (monthlyLimit === -1) {
      await supabaseAdmin.rpc("increment_words_generated", {
        p_user_id: userId,
        p_word_count: actualCost,
      });
    } else {
      const remainingMonthly = Math.max(0, monthlyLimit - wordsUsed);
      if (actualCost <= remainingMonthly) {
        await supabaseAdmin.rpc("increment_words_generated", {
          p_user_id: userId,
          p_word_count: actualCost,
        });
      } else {
        if (remainingMonthly > 0) {
          await supabaseAdmin.rpc("increment_words_generated", {
            p_user_id: userId,
            p_word_count: remainingMonthly,
          });
        }
        const fromExtra = actualCost - remainingMonthly;
        if (fromExtra > 0) {
          await supabaseAdmin.rpc("use_extra_credits", {
            p_user_id: userId,
            p_word_count: fromExtra,
          });
        }
      }
    }

    console.log(`Credits deducted: ${actualCost} for ${successful.length}/${variationCount} variations`);

    return new Response(
      JSON.stringify({
        ...coverRecord,
        covers: successful,
        credits_used: actualCost,
        variations_generated: successful.length,
        variations_failed: failedCount,
      }),
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
