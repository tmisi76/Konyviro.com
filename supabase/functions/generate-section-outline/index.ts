import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const FICTION_SYSTEM_PROMPT = `Te egy regény szerkesztő vagy. Készíts jelenet-vázlatot.
Válaszolj CSAK JSON tömbként:
[{"scene_number": 1, "title": "...", "pov": "character_name", "location": "...", "time": "...", "description": "...", "key_events": [...], "emotional_arc": "...", "target_words": 800, "status": "pending"}]`;

const NONFICTION_SYSTEM_PROMPT = `Te egy bestseller szakkönyv szerkesztő vagy.

SZEKCIÓ STRUKTÚRA MINDEN FEJEZETHEZ:

1. NYITÁS (Hook) - 1 szekció
   - Probléma vagy kérdés felvetése
   - Személyes történet vagy figyelemfelkeltő statisztika
   - Miért fontos ez a fejezet?

2. FŐ TARTALOM - 2-4 szekció
   - Koncepció/módszer bemutatása
   - Lépésről-lépésre útmutató
   - Gyakorlati példák és esettanulmányok
   - Konkrét számok és eredmények

3. ALKALMAZÁS - 1 szekció
   - Hogyan használd a gyakorlatban
   - Konkrét akciólépések
   - Gyakori hibák elkerülése

4. FEJEZET ÖSSZEFOGLALÓ - 1 szekció
   - Kulcspontok bullet point listában
   - "Amit megtanultál ebből a fejezetből"
   - Következő lépés előrevetítése

SZEKCIÓ TÍPUSOK:
- intro: Bevezető hook, személyes történet
- concept: Fogalom/módszer magyarázat
- example: Gyakorlati példák, esettanulmányok
- exercise: Feladat, önértékelés
- summary: Fejezet összefoglaló

STÍLUS SZABÁLYOK:
- Első személy ("Én", "Mi")
- Közvetlen megszólítás ("Te")
- Rövid bekezdések (max 3-4 mondat)
- Minden szekció végén átvezetés a következőbe
- Konkrét, mérhető példák

Válaszolj CSAK JSON tömbként:
[{"section_number": 1, "title": "...", "type": "intro|concept|example|exercise|summary", "key_points": [...], "examples_needed": 1, "learning_objective": "...", "target_words": 800, "status": "pending"}]`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, chapterId, chapterTitle, chapterSummary, bookTopic, targetAudience, genre, chapterType } = await req.json();
    if (!projectId || !chapterId) return new Response(JSON.stringify({ error: "projectId és chapterId szükséges" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const isFiction = genre === "fiction";
    const systemPrompt = isFiction ? FICTION_SYSTEM_PROMPT : NONFICTION_SYSTEM_PROMPT;

    const userPrompt = isFiction
      ? `Készíts 4-8 jelenet-vázlatot:\n\nFEJEZET: ${chapterTitle}\n${chapterSummary ? `ÖSSZEFOGLALÓ: ${chapterSummary}` : ""}`
      : `Készíts 4-8 szekció-vázlatot a STRUKTÚRA szerint:

FEJEZET: ${chapterTitle}
${chapterSummary ? `ÖSSZEFOGLALÓ: ${chapterSummary}` : ""}
TÉMA: ${bookTopic || "Szakkönyv"}
CÉLKÖZÖNSÉG: ${targetAudience || "Általános"}
${chapterType ? `FEJEZET TÍPUS: ${chapterType}` : ""}

KÖTELEZŐ SZEKCIÓK:
1. Nyitás (hook) - személyes történet vagy probléma felvetés
2. 2-4 Fő tartalom szekció - koncepció, lépések, példák
3. Alkalmazás szekció - gyakorlati útmutató
4. Összefoglaló szekció - kulcspontok listája`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], max_tokens: 4000 }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Túl sok kérés" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI hiba");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const sectionOutline = JSON.parse(content);

    if (!Array.isArray(sectionOutline)) throw new Error("Érvénytelen formátum");

    const sceneOutline = sectionOutline.map((s: any) => ({
      scene_number: s.section_number || s.scene_number,
      title: s.title,
      pov: s.type || s.pov,
      location: s.location || `Szekció: ${s.type}`,
      time: s.time || "",
      description: s.learning_objective || s.description || "",
      key_events: s.key_points || s.key_events || [],
      emotional_arc: s.emotional_arc || `Példák: ${s.examples_needed || 0}`,
      target_words: s.target_words || 800,
      status: "pending",
    }));

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("chapters").update({ scene_outline: sceneOutline, generation_status: "pending" }).eq("id", chapterId);

    return new Response(JSON.stringify({ sceneOutline, sectionOutline }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
