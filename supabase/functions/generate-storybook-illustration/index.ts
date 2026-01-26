import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ILLUSTRATION_COST = 500; // Credits per illustration

// Style modifiers for different illustration styles
const STYLE_MODIFIERS: Record<string, string> = {
  "watercolor": "soft watercolor illustration style, gentle pastel colors, dreamy atmosphere, children's book illustration, whimsical, hand-painted look",
  "cartoon": "colorful cartoon illustration, friendly expressive characters, vibrant saturated colors, children's book style, fun and playful",
  "digital-painting": "digital painting, detailed illustration, rich colors, professional children's book art, polished finish",
  "hand-drawn": "hand-drawn illustration style, pencil and ink, warm and cozy feeling, traditional children's book, sketchy lines, nostalgic",
  "pixar-3d": "Pixar-style 3D illustration, cute character design, cinematic lighting, high quality render, Disney animation style, adorable",
  "classic-fairytale": "classic fairytale illustration, vintage storybook style, enchanting and magical, golden age children's book, ornate details",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    const { prompt, style, characters, pageNumber } = await req.json();

    if (!prompt || !style) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: prompt, style" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check credits
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("monthly_word_limit, extra_words_balance")
      .eq("user_id", userId)
      .single();

    if (!profile) {
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

    if (monthlyLimit !== -1) {
      const remainingMonthly = Math.max(0, monthlyLimit - wordsUsed);
      const totalAvailable = remainingMonthly + extraBalance;

      if (totalAvailable < ILLUSTRATION_COST) {
        return new Response(
          JSON.stringify({ 
            error: "Nincs elég kredit az illusztráció generálásához.",
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

    // Build the full prompt with style modifier
    const styleModifier = STYLE_MODIFIERS[style] || STYLE_MODIFIERS["cartoon"];
    
    // Include character descriptions if available
    let characterContext = "";
    if (characters && characters.length > 0) {
      const mainChar = characters.find((c: any) => c.role === "main");
      if (mainChar) {
        characterContext = `The main character is a child named ${mainChar.name}. `;
        if (mainChar.description) {
          characterContext += `${mainChar.description}. `;
        }
      }
    }

    const fullPrompt = `Create a children's book illustration for page ${pageNumber || 1}.

Scene description: ${prompt}

${characterContext}

Style requirements: ${styleModifier}

Important:
- The image should be suitable for a children's book
- Use bright, cheerful colors
- The scene should be clear and easy to understand
- No text or words in the image
- Safe for all ages
- Horizontal landscape orientation (16:9 aspect ratio)`;

    console.log("Generating illustration with prompt:", fullPrompt.substring(0, 300) + "...");

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

    // Extract base64 and upload to Supabase Storage
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid image data format");
    }

    const imageFormat = base64Match[1];
    const base64Data = base64Match[2];
    
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const imagePath = `storybook-illustrations/${userId}/${Date.now()}-page${pageNumber || 1}.${imageFormat}`;

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
    console.log("Illustration uploaded to:", publicUrl);

    // Deduct credits
    if (monthlyLimit === -1) {
      await supabaseAdmin.rpc("increment_words_generated", {
        p_user_id: userId,
        p_word_count: ILLUSTRATION_COST,
      });
    } else {
      const remainingMonthly = Math.max(0, monthlyLimit - wordsUsed);
      
      if (ILLUSTRATION_COST <= remainingMonthly) {
        await supabaseAdmin.rpc("increment_words_generated", {
          p_user_id: userId,
          p_word_count: ILLUSTRATION_COST,
        });
      } else {
        if (remainingMonthly > 0) {
          await supabaseAdmin.rpc("increment_words_generated", {
            p_user_id: userId,
            p_word_count: remainingMonthly,
          });
        }
        const fromExtra = ILLUSTRATION_COST - remainingMonthly;
        if (fromExtra > 0) {
          await supabaseAdmin.rpc("use_extra_credits", {
            p_user_id: userId,
            p_word_count: fromExtra,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        imageUrl: publicUrl,
        credits_used: ILLUSTRATION_COST,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate illustration error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
