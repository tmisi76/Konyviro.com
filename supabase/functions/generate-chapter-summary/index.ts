import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterId, chapterContent, chapterTitle, genre, characters } = await req.json();

    if (!chapterId || !chapterContent) {
      return new Response(JSON.stringify({ error: "Hiányzó mezők" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const isNonFiction = genre === "szakkonyv";

    // Build the appropriate prompt based on genre
    const systemPrompt = isNonFiction
      ? `Te egy szakkönyv elemző asszisztens vagy. Feladatod, hogy összefoglald a fejezet tartalmát és kiemeld a legfontosabb tanulságokat.`
      : `Te egy irodalmi elemző asszisztens vagy. Feladatod, hogy összefoglald a fejezet eseményeit és nyomon kövesd a karakterek cselekedeteit.`;

    const userPrompt = isNonFiction
      ? `Elemezd az alábbi fejezetet: "${chapterTitle}"

FEJEZET TARTALMA:
${chapterContent.slice(0, 8000)}

Adj vissza egy JSON objektumot az alábbi struktúrában:
{
  "summary": "2-3 mondatos összefoglaló arról, mit tanult meg az olvasó ebben a fejezetben",
  "keyPoints": ["Kulcspont 1", "Kulcspont 2", "Kulcspont 3"],
  "characterAppearances": []
}

FONTOS: Csak a JSON objektumot add vissza, semmi mást!`
      : `Elemezd az alábbi fejezetet: "${chapterTitle}"

${characters ? `KARAKTEREK A KÖNYVBEN: ${characters}` : ""}

FEJEZET TARTALMA:
${chapterContent.slice(0, 8000)}

Adj vissza egy JSON objektumot az alábbi struktúrában:
{
  "summary": "2-3 mondatos összefoglaló a fejezet legfontosabb eseményeiről",
  "keyPoints": ["Esemény 1", "Esemény 2", "Esemény 3"],
  "characterAppearances": [
    {"name": "Karakter neve", "actions": ["Mit csinált 1", "Mit csinált 2"]},
    {"name": "Másik karakter", "actions": ["Mit csinált"]}
  ]
}

FONTOS SZABÁLYOK:
- A characterAppearances-be CSAK azokat a karaktereket vedd fel, akik AKTÍVAN szerepeltek a fejezetben
- Az actions legyen rövid, tömör (max 10 szó per action)
- Maximum 5 action per karakter
- Csak a JSON objektumot add vissza, semmi mást!`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "AI hiba" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.content?.[0]?.text || "";

    // Parse JSON from AI response
    let result = {
      summary: "",
      keyPoints: [] as string[],
      characterAppearances: [] as { name: string; actions: string[] }[],
    };

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonStr = jsonMatch[1] || content;
      
      const parsed = JSON.parse(jsonStr.trim());
      result = {
        summary: parsed.summary || "",
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 5) : [],
        characterAppearances: Array.isArray(parsed.characterAppearances) 
          ? parsed.characterAppearances.slice(0, 10) 
          : [],
      };
    } catch (parseError) {
      console.error("Failed to parse AI summary response:", parseError);
      // Fallback: use first 200 chars as summary
      result.summary = chapterContent.slice(0, 200) + "...";
    }

    // Save to database
    const { error: updateError } = await supabase
      .from("chapters")
      .update({
        summary: result.summary,
        key_points: result.keyPoints,
        character_appearances: result.characterAppearances,
      })
      .eq("id", chapterId);

    if (updateError) {
      console.error("Failed to update chapter:", updateError);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
