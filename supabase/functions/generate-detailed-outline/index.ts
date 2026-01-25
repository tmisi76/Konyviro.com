import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { repairAndParseJSON, validateSceneOutline } from "../_shared/json-utils.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Nincs jogosultság" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen vagy lejárt token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${userData.user.id}`);
    // ========== END AUTHENTICATION CHECK ==========

    const { 
      projectId, 
      chapterId, 
      chapterTitle, 
      chapterSummary, 
      storyStructure, 
      characters, 
      genre,
      targetWordCount,
      wordsForChapter,
      totalChapters
    } = await req.json();
    
    if (!projectId || !chapterId) return new Response(JSON.stringify({ error: "projectId és chapterId szükséges" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Calculate how many scenes for this chapter based on word target
    const effectiveWordsForChapter = wordsForChapter || (targetWordCount ? Math.round(targetWordCount / (totalChapters || 3)) : 2500);
    
    // Fewer scenes for shorter books: 1-2 scenes for <500 words/chapter, 2-3 for <1500, etc.
    let scenesForChapter: number;
    if (effectiveWordsForChapter < 500) {
      scenesForChapter = 1;
    } else if (effectiveWordsForChapter < 1000) {
      scenesForChapter = 2;
    } else if (effectiveWordsForChapter < 2000) {
      scenesForChapter = 3;
    } else if (effectiveWordsForChapter < 3500) {
      scenesForChapter = 4;
    } else {
      scenesForChapter = 5;
    }
    
    const wordsPerScene = Math.round(effectiveWordsForChapter / scenesForChapter);

    console.log(`Chapter "${chapterTitle}": ${effectiveWordsForChapter} words, ${scenesForChapter} scenes, ~${wordsPerScene} words/scene`);

    const SYSTEM_PROMPT = `Te egy bestseller regényíró asszisztens vagy. Készíts részletes jelenet-vázlatot.

FONTOS SZABÁLYOK:
- Pontosan ${scenesForChapter} jelenetet generálj
- Minden jelenet ~${wordsPerScene} szó legyen (target_words = ${wordsPerScene})
- A fejezet összesen ${effectiveWordsForChapter} szó körül legyen

Válaszolj CSAK JSON tömbként:
[{"scene_number": 1, "title": "...", "pov": "...", "location": "...", "time": "...", "description": "...", "key_events": [...], "emotional_arc": "...", "target_words": ${wordsPerScene}, "status": "pending"}]`;

    let userPrompt = `Készíts PONTOSAN ${scenesForChapter} jelenet-vázlatot (összesen ~${effectiveWordsForChapter} szó):\n\nFEJEZET: ${chapterTitle}\n${chapterSummary ? `ÖSSZEFOGLALÓ: ${chapterSummary}` : ""}\nMŰFAJ: ${genre}`;
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
            max_tokens: 4096 // Reduced - fewer scenes = less tokens needed
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

        // Retry on empty or suspiciously short response
        if (!content || content.trim().length < 200) {
          console.warn(`Empty or truncated AI response (attempt ${attempt}/${maxRetries}), length: ${content?.length || 0}`);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Az AI nem tudott teljes választ generálni, próbáld újra");
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
    let sceneOutline = validateSceneOutline(parsedOutline);
    
    // Ensure target_words is set for each scene
    sceneOutline = sceneOutline.map((scene, idx) => ({
      ...scene,
      target_words: scene.target_words || wordsPerScene,
      scene_number: idx + 1,
    }));

    console.log("Successfully parsed", sceneOutline.length, "scenes with target_words:", wordsPerScene);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("chapters").update({ scene_outline: sceneOutline, generation_status: "pending" }).eq("id", chapterId);

    return new Response(JSON.stringify({ sceneOutline }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
