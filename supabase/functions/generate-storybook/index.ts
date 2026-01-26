import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STORYBOOK_GENERATION_COST = 3000; // Credits for generating a storybook

interface Character {
  id: string;
  name: string;
  role: "main" | "supporting";
  description?: string;
}

interface StorybookPage {
  id: string;
  pageNumber: number;
  text: string;
  illustrationPrompt: string;
}

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

    const { 
      theme, 
      customThemeDescription, 
      ageGroup, 
      illustrationStyle, 
      characters, 
      storyPrompt, 
      title 
    } = await req.json();

    // Validate required fields
    if (!theme || !ageGroup || !characters?.length || !storyPrompt) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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

      if (totalAvailable < STORYBOOK_GENERATION_COST) {
        return new Response(
          JSON.stringify({ 
            error: "Nincs elég kredit a mesekönyv generálásához.",
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

    // Determine page count based on age group
    const pageCountMap: Record<string, number> = {
      "0-3": 8,
      "3-6": 12,
      "6-9": 16,
    };
    const pageCount = pageCountMap[ageGroup] || 12;

    // Build character descriptions
    const mainCharacter = characters.find((c: Character) => c.role === "main");
    const supportingCharacters = characters.filter((c: Character) => c.role === "supporting");
    
    const characterDescriptions = characters.map((c: Character) => 
      `${c.name}${c.description ? ` (${c.description})` : ""}`
    ).join(", ");

    // Generate story with AI
    const storyPromptFull = `Írj egy gyerekeknek szóló mesét magyar nyelven.

TÉMA: ${theme === "custom" ? customThemeDescription : theme}
KOROSZTÁLY: ${ageGroup} éves gyerekek
FŐSZEREPLŐ: ${mainCharacter?.name || "a főhős"}
${supportingCharacters.length > 0 ? `MELLÉKSZEREPLŐK: ${supportingCharacters.map((c: Character) => c.name).join(", ")}` : ""}

A FELHASZNÁLÓ ÖTLETE: ${storyPrompt}

KÖVETELMÉNYEK:
- A mese legyen ${pageCount} oldalas
- Minden oldal maximum ${ageGroup === "0-3" ? "10" : ageGroup === "3-6" ? "30" : "50"} szó
- Egyszerű, könnyen érthető nyelvezet
- Pozitív üzenet és tanulság
- A főszereplő neve legyen ${mainCharacter?.name || "a főhős"}
- Minden oldal végén legyen egy természetes törés

Válaszolj JSON formátumban:
{
  "title": "A mese címe",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Az oldal szövege...",
      "illustrationPrompt": "Angol nyelvű leírás az illusztrációhoz, ami pontosan leírja a jelenetet"
    }
  ]
}`;

    console.log("Generating storybook with prompt:", storyPromptFull.substring(0, 500) + "...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          { 
            role: "system", 
            content: "Te egy kreatív meseíró vagy, aki gyönyörű gyerekmesét ír. Mindig JSON formátumban válaszolj." 
          },
          { role: "user", content: storyPromptFull }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    let storyData;
    try {
      storyData = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    // Format pages with IDs
    const pages: StorybookPage[] = (storyData.pages || []).map((page: any, index: number) => ({
      id: `page-${Date.now()}-${index}`,
      pageNumber: page.pageNumber || index + 1,
      text: page.text,
      illustrationPrompt: page.illustrationPrompt,
    }));

    // Deduct credits
    if (monthlyLimit === -1) {
      await supabaseAdmin.rpc("increment_words_generated", {
        p_user_id: userId,
        p_word_count: STORYBOOK_GENERATION_COST,
      });
    } else {
      const remainingMonthly = Math.max(0, monthlyLimit - wordsUsed);
      
      if (STORYBOOK_GENERATION_COST <= remainingMonthly) {
        await supabaseAdmin.rpc("increment_words_generated", {
          p_user_id: userId,
          p_word_count: STORYBOOK_GENERATION_COST,
        });
      } else {
        if (remainingMonthly > 0) {
          await supabaseAdmin.rpc("increment_words_generated", {
            p_user_id: userId,
            p_word_count: remainingMonthly,
          });
        }
        const fromExtra = STORYBOOK_GENERATION_COST - remainingMonthly;
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
        title: storyData.title || title,
        story: content,
        pages,
        credits_used: STORYBOOK_GENERATION_COST,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate storybook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
