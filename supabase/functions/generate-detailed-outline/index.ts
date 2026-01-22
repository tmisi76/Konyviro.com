import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Te egy bestseller regényíró asszisztens vagy, aki részletes jelenet-szintű vázlatokat készít könyvekhez.

A feladatod: A megadott sztori struktúra és fejezet információk alapján készíts részletes jelenet-vázlatot.

Minden jelenetnek tartalmaznia kell:
1. scene_number: Jelenet sorszáma (1-től kezdve)
2. title: Rövid, drámai cím
3. pov: Kinek a szemszögéből írjuk (a karakterek közül)
4. location: Pontos helyszín
5. time: Napszak vagy konkrét időpont
6. description: 2-3 mondatos részletes leírás arról, mi történik
7. key_events: Lista a fontos eseményekről (max 4)
8. emotional_arc: Az érzelmi ív (pl. "Félelem → Megdöbbenés → Vágy")
9. target_words: Célhossz szavakban (500-1500 között)
10. status: Mindig "pending"

FONTOS SZABÁLYOK:
- Oszd el a fejezetet 3-6 jelenetre a komplexitástól függően
- A jelenetek együtt adják ki a fejezet teljes cselekményét
- Figyelj a feszültségépítésre és az érzelmi ívekre
- CSAK a megadott karaktereket használd, NE találj ki újakat!
- A válasz CSAK tiszta JSON legyen, semmi más szöveg!

A válasz formátuma KÖTELEZŐEN egy JSON tömb:
[
  {
    "scene_number": 1,
    "title": "...",
    "pov": "...",
    "location": "...",
    "time": "...",
    "description": "...",
    "key_events": ["...", "..."],
    "emotional_arc": "...",
    "target_words": 800,
    "status": "pending"
  }
]`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      projectId, 
      chapterId,
      chapterTitle,
      chapterSummary,
      storyStructure, 
      characters,
      genre,
      previousChaptersSummary,
      nextChapterTitle
    } = await req.json();

    if (!projectId || !chapterId) {
      return new Response(
        JSON.stringify({ error: "projectId and chapterId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context for the AI
    let userPrompt = `Készíts részletes jelenet-vázlatot az alábbi fejezethez:

FEJEZET CÍM: ${chapterTitle}
${chapterSummary ? `FEJEZET ÖSSZEFOGLALÓ: ${chapterSummary}` : ""}

MŰFAJ: ${genre === "erotikus" ? "Erotikus regény (felnőtt tartalom megengedett)" : genre === "fiction" ? "Szépirodalmi regény" : "Szakkönyv"}
`;

    if (storyStructure) {
      userPrompt += `
TÖRTÉNET KONTEXTUS:
- Főszereplő: ${storyStructure.protagonist?.name || "N/A"} - ${storyStructure.protagonist?.description || ""}
- Ellenfél/Partner: ${storyStructure.antagonist?.name || "N/A"} - ${storyStructure.antagonist?.description || ""}
- Helyszín: ${storyStructure.setting || "N/A"}
- Témák: ${storyStructure.themes?.join(", ") || "N/A"}
`;

      if (storyStructure.plotPoints?.length) {
        userPrompt += `
FONTOS FORDULÓPONTOK:
${storyStructure.plotPoints.map((p: { beat: string; description: string }) => `- ${p.beat}: ${p.description}`).join("\n")}
`;
      }
    }

    if (characters) {
      userPrompt += `
KARAKTEREK (CSAK EZEKET HASZNÁLD!):
${characters}
`;
    }

    if (previousChaptersSummary) {
      userPrompt += `
EDDIG TÖRTÉNT:
${previousChaptersSummary}
`;
    }

    if (nextChapterTitle) {
      userPrompt += `
KÖVETKEZŐ FEJEZET: ${nextChapterTitle}
(Készítsd elő a következő fejezet cselekményét!)
`;
    }

    userPrompt += `
Készíts 3-6 jelenet-vázlatot ehhez a fejezethez. A válasz CSAK a JSON tömb legyen!`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Túl sok kérés. Kérlek várj egy kicsit." }),
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

    const data = await response.json();
    let content = data.content?.[0]?.text || "";

    // Clean up the response - remove markdown code blocks if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    // Parse the JSON
    let sceneOutline;
    try {
      sceneOutline = JSON.parse(content);
    } catch {
      console.error("Failed to parse scene outline:", content);
      return new Response(
        JSON.stringify({ error: "Nem sikerült feldolgozni a jelenet-vázlatot" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the structure
    if (!Array.isArray(sceneOutline) || sceneOutline.length === 0) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen jelenet-vázlat formátum" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the chapter with the scene outline
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("chapters")
      .update({ 
        scene_outline: sceneOutline,
        generation_status: "pending"
      })
      .eq("id", chapterId);

    if (updateError) {
      console.error("Failed to update chapter:", updateError);
      return new Response(
        JSON.stringify({ error: "Nem sikerült menteni a jelenet-vázlatot" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ sceneOutline }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate outline error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
