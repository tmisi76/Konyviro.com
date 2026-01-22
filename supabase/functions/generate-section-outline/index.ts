import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Te egy tapasztalt szakkönyv szerző és szerkesztő asszisztens vagy, aki részletes szekció-szintű vázlatokat készít szakkönyvekhez.

A feladatod: A megadott fejezet információk alapján készíts részletes szekció-vázlatot.

Minden szekciónak tartalmaznia kell:
1. section_number: Szekció sorszáma (1-től kezdve)
2. title: Rövid, informatív cím
3. type: A szekció típusa (intro, concept, example, exercise, summary, case_study)
4. key_points: Lista a fontos pontokról (max 5)
5. examples_needed: Hány példát kell tartalmaznia (0-3)
6. learning_objective: Mit fog megtanulni az olvasó
7. target_words: Célhossz szavakban (400-1200 között)
8. status: Mindig "pending"

SZEKCIÓ TÍPUSOK:
- intro: Bevezető, a probléma bemutatása, miért fontos a téma
- concept: Fogalom magyarázat, definíciók, elméleti alapok
- example: Konkrét példák, esettanulmányok szemléltetésre
- exercise: Gyakorlati feladatok, kérdések az olvasónak
- summary: Összefoglaló, kulcspontok, következő lépések
- case_study: Részletes esettanulmány valós helyzetből

FONTOS SZABÁLYOK:
- Oszd el a fejezetet 4-8 szekcióra a komplexitástól függően
- Minden fejezet tartalmazzon: intro, legalább 2 concept, legalább 1 example, summary
- A szekciók együtt adják ki a fejezet didaktikus ívét
- A válasz CSAK tiszta JSON legyen, semmi más szöveg!

A válasz formátuma KÖTELEZŐEN egy JSON tömb:
[
  {
    "section_number": 1,
    "title": "...",
    "type": "intro",
    "key_points": ["...", "..."],
    "examples_needed": 0,
    "learning_objective": "...",
    "target_words": 600,
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
      bookTopic, 
      learningObjectives,
      targetAudience,
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
    let userPrompt = `Készíts részletes szekció-vázlatot az alábbi szakkönyv fejezethez:

FEJEZET CÍM: ${chapterTitle}
${chapterSummary ? `FEJEZET ÖSSZEFOGLALÓ: ${chapterSummary}` : ""}

KÖNYV TÉMA: ${bookTopic || "Általános szakkönyv"}
CÉLKÖZÖNSÉG: ${targetAudience || "Általános olvasóközönség"}
`;

    if (learningObjectives?.length) {
      userPrompt += `
TANULÁSI CÉLOK:
${learningObjectives.map((obj: string, i: number) => `${i + 1}. ${obj}`).join("\n")}
`;
    }

    if (previousChaptersSummary) {
      userPrompt += `
ELŐZŐ FEJEZETEK ÖSSZEFOGLALÓJA:
${previousChaptersSummary}
`;
    }

    if (nextChapterTitle) {
      userPrompt += `
KÖVETKEZŐ FEJEZET: ${nextChapterTitle}
(Készítsd elő a következő fejezet témáját!)
`;
    }

    userPrompt += `
Készíts 4-8 szekció-vázlatot ehhez a fejezethez. A válasz CSAK a JSON tömb legyen!`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
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
    let sectionOutline;
    try {
      sectionOutline = JSON.parse(content);
    } catch {
      console.error("Failed to parse section outline:", content);
      return new Response(
        JSON.stringify({ error: "Nem sikerült feldolgozni a szekció-vázlatot" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the structure
    if (!Array.isArray(sectionOutline) || sectionOutline.length === 0) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen szekció-vázlat formátum" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform to scene_outline format for compatibility
    const sceneOutline = sectionOutline.map((section: {
      section_number: number;
      title: string;
      type: string;
      key_points?: string[];
      examples_needed?: number;
      learning_objective?: string;
      target_words?: number;
      status?: string;
    }) => ({
      scene_number: section.section_number,
      title: section.title,
      pov: section.type, // Use type as POV field for non-fiction
      location: `Szekció típus: ${section.type}`,
      time: "",
      description: section.learning_objective || "",
      key_events: section.key_points || [],
      emotional_arc: `Példák: ${section.examples_needed || 0}`,
      target_words: section.target_words || 800,
      status: section.status || "pending",
    }));

    // Update the chapter with the section outline
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
        JSON.stringify({ error: "Nem sikerült menteni a szekció-vázlatot" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ sceneOutline, sectionOutline }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate section outline error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
