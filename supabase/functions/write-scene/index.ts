import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Genre-specific system prompts
const SYSTEM_PROMPTS: Record<string, string> = {
  fiction: `Te egy bestseller regényíró vagy. Feladatod, hogy a megadott jelenet-vázlat alapján megírd a jelenet teljes szövegét.

ÍRÁSI SZABÁLYOK:
- Használj élénk, képszerű leírásokat
- "Show, don't tell" - mutass, ne mondj
- A karakterek beszédstílusa egyedi legyen
- Építs feszültséget és érzelmi ívet
- CSAK a megadott karaktereket használd
- Tartsd meg a megadott POV szemszöget
- A jelenet hossza közelítsen a target_words értékhez
- Magyar nyelven írj, irodalmi stílusban`,

  erotikus: `Te egy sikeres erotikus regényíró vagy. Feladatod, hogy a megadott jelenet-vázlat alapján megírd a jelenet teljes szövegét.

ÍRÁSI SZABÁLYOK:
- Építsd az érzelmi és fizikai intimitást fokozatosan
- Használj érzéki, de nem vulgáris nyelvezetet
- A karakterek személyisége az intim jelenetekben is megmarad
- Az explicit tartalom a történet szerves része
- CSAK a megadott karaktereket használd
- Tartsd meg a megadott POV szemszöget
- A jelenet hossza közelítsen a target_words értékhez
- Magyar nyelven írj, irodalmi stílusban
- A beleegyezés és tisztelet fontos`,

  szakkonyv: `Te egy tapasztalt szakkönyv szerző vagy. Feladatod, hogy a megadott vázlat alapján megírd a szekció teljes szövegét.

ÍRÁSI SZABÁLYOK:
- Világos, logikus struktúra
- Magyarázd el a szakkifejezéseket
- Adj konkrét példákat
- Didaktikus, de olvasmányos stílus
- A szekció hossza közelítsen a target_words értékhez
- Magyar nyelven írj, szakmai stílusban`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      projectId, 
      chapterId,
      sceneNumber,
      sceneOutline,
      previousContent,
      characters,
      storyStructure,
      genre,
      chapterTitle
    } = await req.json();

    if (!projectId || !chapterId || !sceneOutline) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[genre] || SYSTEM_PROMPTS.fiction;

    let userPrompt = `ÍRD MEG AZ ALÁBBI JELENETET:

FEJEZET: ${chapterTitle}
JELENET #${sceneNumber}: "${sceneOutline.title}"

JELENET RÉSZLETEI:
- POV (nézőpont): ${sceneOutline.pov}
- Helyszín: ${sceneOutline.location}
- Időpont: ${sceneOutline.time}
- Mi történik: ${sceneOutline.description}
- Kulcsesemények: ${sceneOutline.key_events?.join(", ")}
- Érzelmi ív: ${sceneOutline.emotional_arc}
- Célhossz: ~${sceneOutline.target_words} szó
`;

    if (storyStructure) {
      userPrompt += `
TÖRTÉNET KONTEXTUS:
- Főszereplő: ${storyStructure.protagonist?.name} - ${storyStructure.protagonist?.description}
  Belső konfliktus: ${storyStructure.protagonist?.innerConflict || "N/A"}
  Karakterív: ${storyStructure.protagonist?.arc || "N/A"}
- Ellenfél/Partner: ${storyStructure.antagonist?.name} - ${storyStructure.antagonist?.description}
- Helyszín: ${storyStructure.setting}
`;
    }

    if (characters) {
      userPrompt += `
KARAKTEREK (KÖTELEZŐ HASZNÁLNI, NE TALÁLJ KI ÚJAKAT!):
${characters}
`;
    }

    if (previousContent) {
      userPrompt += `
AZ EDDIGI TARTALOM (folytatásként írd):
---
${previousContent}
---
`;
    }

    userPrompt += `
Most írd meg ezt a jelenetet! A válasz CSAK a jelenet szövege legyen, semmi más megjegyzés vagy formázás.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: Math.min(sceneOutline.target_words * 2, 8000),
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Túl sok kérés. Kérlek várj." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredit elfogyott." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI szolgáltatás hiba" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Write scene error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
