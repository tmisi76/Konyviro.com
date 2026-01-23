import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { repairAndParseJSON, validateSceneOutline } from "../_shared/json-utils.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const SYSTEM_PROMPT = `Te egy bestseller regényíró asszisztens vagy. Készíts részletes jelenet-vázlatot.
Válaszolj CSAK JSON tömbként:
[{"scene_number": 1, "title": "...", "pov": "...", "location": "...", "time": "...", "description": "...", "key_events": [...], "emotional_arc": "...", "target_words": 800, "status": "pending"}]`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, chapterId, chapterTitle, chapterSummary, storyStructure, characters, genre } = await req.json();
    if (!projectId || !chapterId) return new Response(JSON.stringify({ error: "projectId és chapterId szükséges" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let userPrompt = `Készíts 3-6 jelenet-vázlatot:\n\nFEJEZET: ${chapterTitle}\n${chapterSummary ? `ÖSSZEFOGLALÓ: ${chapterSummary}` : ""}\nMŰFAJ: ${genre}`;
    if (storyStructure) userPrompt += `\nKONTEXTUS: ${JSON.stringify(storyStructure)}`;
    if (characters) userPrompt += `\nKARAKTEREK: ${characters}`;

    // Rock-solid retry logic with max resilience
    const maxRetries = 7;
    const MAX_TIMEOUT = 120000; // 2 minutes timeout
    let content = "";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT);

        console.log(`AI request attempt ${attempt}/${maxRetries} for chapter: ${chapterTitle}`);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ 
            model: "google/gemini-3-flash-preview", 
            messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }], 
            max_tokens: 8192 // INCREASED for maximum response length
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Retry on transient errors
        if (response.status === 429 || response.status === 502 || response.status === 503) {
          console.error(`Status ${response.status} (attempt ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          throw new Error("AI szolgáltatás nem elérhető");
        }

        if (!response.ok) {
          console.error(`Response not ok: ${response.status}`);
          throw new Error("AI hiba");
        }

        const data = await response.json();
        content = data.choices?.[0]?.message?.content || "";

        // Retry on empty response
        if (!content || content.trim().length < 10) {
          console.warn(`Empty or too short AI response (attempt ${attempt}/${maxRetries}), length: ${content?.length || 0}`);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Az AI nem tudott választ generálni, próbáld újra");
        }

        // Success - exit retry loop
        console.log(`AI response received, length: ${content.length}`);
        break;

      } catch (fetchError) {
        console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw fetchError;
      }
    }

    console.log("Raw AI response length:", content.length);

    // Use robust JSON parsing with repair capability
    let parsedOutline;
    try {
      parsedOutline = repairAndParseJSON(content);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Content preview:", content.substring(0, 1000));
      throw new Error("Nem sikerült feldolgozni az AI válaszát");
    }

    // Validate and normalize the outline
    const sceneOutline = validateSceneOutline(parsedOutline);

    console.log("Successfully parsed", sceneOutline.length, "scenes");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("chapters").update({ scene_outline: sceneOutline, generation_status: "pending" }).eq("id", chapterId);

    return new Response(JSON.stringify({ sceneOutline }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
