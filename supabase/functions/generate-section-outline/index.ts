import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { repairAndParseJSON } from "../_shared/json-utils.ts";

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

// Retry configuration
const MAX_RETRIES = 10;
const BASE_DELAY_MS = 8000;
const MAX_DELAY_MS = 120000;

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

    // Main retry loop - covers EVERYTHING including response parsing
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Outline generation attempt ${attempt}/${MAX_RETRIES} for chapter: ${chapterTitle?.substring(0, 50)}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], max_tokens: 6000 }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limiting - wait WITHOUT counting as retry
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(30000 + Math.random() * 30000, 60000);
          console.log(`Rate limited (429). Waiting ${Math.ceil(delay/1000)}s (attempt ${attempt} - NOT counting as retry)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt--; // Don't count rate limit as a retry
          continue;
        }

        // Handle server errors with retry
        if (response.status === 502 || response.status === 503 || response.status === 500) {
          console.error(`Server error ${response.status} (attempt ${attempt}/${MAX_RETRIES})`);
          const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Unexpected response ${response.status}: ${errorText}`);
          throw new Error(`AI hiba: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";

        // Check for empty or too short response
        if (!content || content.trim().length < 50) {
          console.error(`Empty or too short AI response (length: ${content?.length || 0}), attempt ${attempt}/${MAX_RETRIES}`);
          const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
          console.log(`Waiting ${Math.ceil(delay/1000)}s before retry for empty response...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        console.log("Raw AI response length:", content.length);

        // Try to parse the JSON
        let sectionOutline;
        try {
          sectionOutline = repairAndParseJSON<unknown[]>(content);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          console.error("Content preview:", content.substring(0, 500));
          const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
          console.log(`Waiting ${Math.ceil(delay/1000)}s before retry for parse error...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Validate the parsed result
        if (!Array.isArray(sectionOutline) || sectionOutline.length === 0) {
          console.error("Invalid format: empty or not array, attempt", attempt);
          const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        console.log("Successfully parsed", sectionOutline.length, "sections");

        // Transform to scene outline format
        const sceneOutline = sectionOutline.map((s: any, index: number) => ({
          scene_number: s.section_number || s.scene_number || index + 1,
          title: s.title || `Szekció ${index + 1}`,
          pov: s.type || s.pov || "concept",
          location: s.location || `Szekció: ${s.type || "content"}`,
          time: s.time || "",
          description: s.learning_objective || s.description || "",
          key_events: s.key_points || s.key_events || [],
          emotional_arc: s.emotional_arc || `Példák: ${s.examples_needed || 0}`,
          target_words: s.target_words || 800,
          status: "pending",
        }));

        // Save to database
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        
        const { data: updateData, error: updateError } = await supabase
          .from("chapters")
          .update({ scene_outline: sceneOutline, generation_status: "pending" })
          .eq("id", chapterId)
          .select();

        if (updateError) {
          console.error("Failed to save outline to DB:", updateError);
          throw new Error(`Nem sikerült menteni a vázlatot: ${updateError.message}`);
        }

        if (!updateData || updateData.length === 0) {
          console.error("Update returned no data - chapter may not exist:", chapterId);
          throw new Error("Nem sikerült frissíteni a fejezetet - nem található");
        }

        console.log(`Successfully saved ${sceneOutline.length} scenes to chapter ${chapterId}`);

        return new Response(JSON.stringify({ sceneOutline, sectionOutline }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        
      } catch (innerError) {
        console.error(`Attempt ${attempt}/${MAX_RETRIES} failed:`, innerError);
        lastError = innerError instanceof Error ? innerError : new Error(String(innerError));
        
        // Handle abort/timeout errors
        if (innerError instanceof Error && innerError.name === "AbortError") {
          console.log("Request timed out, retrying...");
        }
        
        // Wait before next retry (unless it's the last attempt)
        if (attempt < MAX_RETRIES) {
          const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
          console.log(`Waiting ${Math.ceil(delay/1000)}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    console.error("All retries exhausted for outline generation");
    return new Response(
      JSON.stringify({ error: lastError?.message || "Vázlat generálás sikertelen - próbáld újra később" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
