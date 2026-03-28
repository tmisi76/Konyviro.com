import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings } from "../_shared/ai-settings.ts";
import { detectRepetition } from "../_shared/repetition-detector.ts";
import { checkSceneQuality, stripMarkdown, buildQualityRetryPrompt } from "../_shared/quality-checker.ts";
import {
  NO_MARKDOWN_RULE,
  HUNGARIAN_GRAMMAR_RULES,
  buildStylePrompt,
  buildFictionStylePrompt,
  buildCharacterContext,
  buildCharacterHistoryContext,
  buildPreviousChaptersSummary,
  buildCharacterNameLock,
  buildPOVEnforcement,
  buildScenePositionContext,
  buildAntiSummaryRules,
  buildDialogueVarietyRules,
  buildAntiRepetitionPrompt,
} from "../_shared/prompt-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const BASE_PROMPTS: Record<string, string> = {
  fiction: `Te egy bestseller magyar író vagy. Írj gazdag leírásokkal és párbeszédekkel.${NO_MARKDOWN_RULE}${HUNGARIAN_GRAMMAR_RULES}`,
  erotikus: `Te egy erotikus regényíró vagy. Írj érzéki magyar prózát.${NO_MARKDOWN_RULE}${HUNGARIAN_GRAMMAR_RULES}`,
  szakkonyv: `Te egy szakkönyvíró vagy. Írj világos, informatív szöveget.${NO_MARKDOWN_RULE}${HUNGARIAN_GRAMMAR_RULES}`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();
    
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId szükséges" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user with anon key client
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = userData.user.id;
    // ========== END AUTHENTICATION CHECK ==========

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch AI generation settings
    const aiSettings = await getAISettings(supabaseUrl, supabaseServiceKey);

    // Get project with extended fields for rich prompts
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title, genre, subcategory, user_id, writing_status, story_structure, generated_story, fiction_style, story_idea, tone, target_audience")
      .eq("id", projectId)
      .single();
    
    if (projectError || !project) {
      console.error("Project fetch error:", projectError);
      return new Response(
        JSON.stringify({ error: "Projekt nem található" }), 
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== OWNERSHIP VERIFICATION ==========
    if (project.user_id !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: "Access denied: you do not own this project" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ========== END OWNERSHIP VERIFICATION ==========
    
    if (project.writing_status !== "background_writing") {
      return new Response(
        JSON.stringify({ status: "stopped" }), 
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get chapters with summary and character_appearances for continuity
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order");

    // Fetch characters and style profile for enriched prompts (parallel)
    const [charactersResult, styleProfileResult] = await Promise.all([
      supabase.from("characters")
        .select("name, role, positive_traits, negative_traits, speech_style, development_arc")
        .eq("project_id", projectId),
      supabase.from("user_style_profiles")
        .select("*")
        .eq("user_id", project?.user_id || "")
        .maybeSingle(),
    ]);
    
    if (chaptersError || !chapters?.length) {
      await supabase
        .from("projects")
        .update({ writing_status: "failed", background_error: "Nincsenek fejezetek" })
        .eq("id", projectId);
      return new Response(
        JSON.stringify({ error: "Nincsenek fejezetek" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find next pending scene
    let targetChapter = null;
    let targetSceneIndex = -1;
    
    for (const ch of chapters) {
      const scenes = (ch.scene_outline as any[]) || [];
      for (let i = 0; i < scenes.length; i++) {
        // NULL JELENET KIHAGYÁSA
        if (!scenes[i] || typeof scenes[i] !== 'object') {
          console.warn(`Null/invalid scene at index ${i} in chapter ${ch.id}, skipping`);
          continue;
        }
        if (scenes[i].status === "pending" || scenes[i].status === "writing") {
          targetChapter = ch;
          targetSceneIndex = i;
          break;
        }
      }
      if (targetChapter) break;
    }

    // If no pending scenes, check why
    if (!targetChapter) {
      // Check if any chapter has scenes at all
      const hasAnyScenes = chapters.some(ch => 
        ch.scene_outline && (ch.scene_outline as any[]).length > 0
      );
      
      if (!hasAnyScenes) {
        // No scenes exist - this is an error state
        await supabase
          .from("projects")
          .update({ 
            writing_status: "failed", 
            background_error: "Nincsenek jelenet vázlatok. Kérlek próbáld újra indítani a háttérírást." 
          })
          .eq("id", projectId);
        
        return new Response(
          JSON.stringify({ error: "Nincsenek jelenet vázlatok", status: "failed" }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // All scenes are completed - book is done!
      await supabase
        .from("projects")
        .update({ writing_status: "completed", background_error: null })
        .eq("id", projectId);
      
      // TODO: Send completion email
      return new Response(
        JSON.stringify({ status: "completed" }), 
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark scene as writing
    const scenes = [...(targetChapter.scene_outline as any[])];
    scenes[targetSceneIndex].status = "writing";
    await supabase
      .from("chapters")
      .update({ scene_outline: scenes, generation_status: "in_progress" })
      .eq("id", targetChapter.id);

    // Get previous content for context
    const { data: blocks } = await supabase
      .from("blocks")
      .select("content")
      .eq("chapter_id", targetChapter.id)
      .order("sort_order");

    const prevContent = blocks?.map(b => b.content).join("\n\n") || "";

    // Determine genre for prompt
    const genre = project.genre === "szakkonyv" || project.genre === "szakkönyv"
      ? "szakkonyv"
      : project.subcategory === "erotikus"
        ? "erotikus"
        : "fiction";

    const scene = scenes[targetSceneIndex];

    // Explicit null ellenőrzés a jelenet objektumra
    if (!scene || typeof scene !== 'object') {
      console.error(`Invalid scene at index ${targetSceneIndex}:`, scene);
      scenes[targetSceneIndex] = { status: "skipped", error: "Invalid scene data" };
      await supabase.from("chapters").update({ scene_outline: scenes }).eq("id", targetChapter.id);
      return new Response(
        JSON.stringify({ status: "scene_skipped", sceneIndex: targetSceneIndex, reason: "Invalid scene data" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== BUILD ENRICHED SYSTEM PROMPT ==========
    const baseSystemPrompt = BASE_PROMPTS[genre] || BASE_PROMPTS.fiction;
    const fictionStylePrompt = genre !== "szakkonyv"
      ? buildFictionStylePrompt(project.fiction_style as Record<string, unknown> | null, project.subcategory)
      : "";
    const stylePrompt = buildStylePrompt(styleProfileResult?.data as Record<string, unknown> | null);
    const systemPrompt = baseSystemPrompt + fictionStylePrompt + stylePrompt;

    // ========== BUILD ENRICHED USER PROMPT ==========
    // Character context
    const characterCtx = buildCharacterContext(charactersResult?.data || null);

    // Character history from previous chapters
    const previousChapters = chapters!.filter(ch => ch.sort_order < targetChapter.sort_order);
    const charHistoryCtx = buildCharacterHistoryContext(
      previousChapters.map(ch => ch.character_appearances as { name: string; actions: string[] }[])
    );

    // Previous chapters summary for continuity
    const prevChaptersSummary = buildPreviousChaptersSummary(
      chapters!.map(ch => ({ title: ch.title, summary: ch.summary, sort_order: ch.sort_order })),
      targetChapter.sort_order
    );

    // If this is the first scene of a chapter, also get the last content from previous chapter
    let crossChapterContext = "";
    if (targetSceneIndex === 0 && previousChapters.length > 0) {
      const lastPrevChapter = previousChapters[previousChapters.length - 1];
      const { data: prevChBlocks } = await supabase
        .from("blocks")
        .select("content")
        .eq("chapter_id", lastPrevChapter.id)
        .order("sort_order", { ascending: false })
        .limit(3);
      if (prevChBlocks?.length) {
        crossChapterContext = `\n\nAz előző fejezet ("${lastPrevChapter.title}") utolsó részlete:\n${prevChBlocks.reverse().map(b => b.content).join("\n").slice(-1000)}`;
      }
    }

    // Extract story context from generated_story (fetched but previously unused)
    let storyContext = "";
    const genStory = project.generated_story as Record<string, unknown> | null;
    if (genStory) {
      const synopsis = genStory.synopsis as string || "";
      const themes = (genStory.themes as string[]) || [];
      const plotPoints = (genStory.plotPoints as Array<{beat: string; description: string}>) || [];
      if (synopsis) storyContext += `\nKÖNYV SZINOPSZISA: ${synopsis}`;
      if (themes.length) storyContext += `\nTÉMÁK: ${themes.join(", ")}`;
      if (plotPoints.length) {
        const relevantPoints = plotPoints.slice(0, 4).map(p => `${p.beat}: ${p.description}`).join("; ");
        storyContext += `\nFŐ CSELEKMÉNYPONTOK: ${relevantPoints}`;
      }
    } else if (project.story_idea) {
      storyContext += `\nKÖNYV ÖTLETE: ${(project.story_idea as string).slice(0, 500)}`;
    }

    // Character name lock
    const nameLock = buildCharacterNameLock(charactersResult?.data || null);

    // POV enforcement
    const povEnforcement = buildPOVEnforcement(
      scene.pov || null,
      (project.fiction_style as Record<string, unknown>)?.pov as string || null,
      scene.pov_character || undefined
    );

    // Scene position context
    const scenePositionCtx = buildScenePositionContext(
      targetSceneIndex,
      scenes.length,
      chapters!.indexOf(targetChapter),
      chapters!.length
    );

    // Anti-summary, dialogue variety, anti-repetition rules
    const antiSummary = buildAntiSummaryRules();
    const dialogueVariety = buildDialogueVarietyRules();
    const antiRepetition = buildAntiRepetitionPrompt(prevContent || undefined);

    const prompt = `${storyContext ? storyContext + "\n" : ""}ÍRD MEG: ${targetChapter.title} - Jelenet ${targetSceneIndex + 1}/${scenes.length}${scene.title ? `: "${scene.title}"` : ""}

POV: ${scene.pov || "Harmadik személy"}
Helyszín: ${scene.location || "Ismeretlen"}
Idő: ${scene.time || "Nincs megadva"}
Mi történik: ${scene.description || "Folytasd a történetet"}
Kulcsesemények: ${(scene.key_events || []).join(", ") || "Folytasd a cselekményt"}
Érzelmi ív: ${scene.emotional_arc || "Nincs megadva"}
${scene.pov_goal ? `POV karakter célja: ${scene.pov_goal}` : ""}
${scene.pov_emotion_start ? `Érzelmi állapot a jelenet elején: ${scene.pov_emotion_start}` : ""}
${scene.pov_emotion_end ? `Érzelmi állapot a jelenet végén: ${scene.pov_emotion_end}` : ""}
Célhossz: ~${scene.target_words || 1000} szó
${characterCtx}${nameLock}${povEnforcement}${charHistoryCtx}${prevChaptersSummary}${crossChapterContext}${scenePositionCtx}${antiSummary}${dialogueVariety}${antiRepetition}
${prevContent ? `\nElőző szöveg folytatása:\n${prevContent.slice(-2000)}` : ""}

CSAK a jelenet szövegét add vissza, mindenféle bevezető vagy záró kommentár nélkül.`;

    // Generate scene content with rock-solid retry logic
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI nincs konfigurálva" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const maxRetries = 7;
    const MAX_TIMEOUT = 120000; // 2 minutes
    let sceneText = "";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT);

        console.log(`AI request attempt ${attempt}/${maxRetries} for scene ${targetSceneIndex + 1}`);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            max_tokens: 8192,
            temperature: aiSettings.temperature,
            frequency_penalty: aiSettings.frequency_penalty,
            presence_penalty: aiSettings.presence_penalty,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limit and gateway errors
        if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504 || res.status === 529) {
          console.error(`Status ${res.status} (attempt ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          if (res.status === 429) {
            return new Response(
              JSON.stringify({ error: "Túl sok kérés, próbáld újra később" }), 
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          return new Response(
            JSON.stringify({ error: "AI szolgáltatás túlterhelt" }), 
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!res.ok) {
          const errorText = await res.text();
          console.error("AI API error:", res.status, errorText.substring(0, 200));
          
          // Retry on 5xx errors
          if (res.status >= 500 && attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error(`API: ${res.status}`);
        }
        
        // Parse response safely
        let d;
        try {
          d = await res.json();
        } catch (parseError) {
          console.error(`JSON parse error (attempt ${attempt}/${maxRetries}):`, parseError);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Hibás API válasz formátum");
        }

        sceneText = d.choices?.[0]?.message?.content || "";
        
        // Retry on empty or too short response
        if (!sceneText || sceneText.trim().length < 100) {
          console.warn(`Empty/too short response (attempt ${attempt}/${maxRetries}), length: ${sceneText?.length || 0}`);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Az AI nem tudott megfelelő választ generálni");
        }

        // Success
        console.log(`AI response received, length: ${sceneText.length}`);
        break;

      } catch (fetchError) {
        console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          console.error(`Timeout after ${MAX_TIMEOUT/1000}s`);
          if (attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return new Response(
            JSON.stringify({ error: "Időtúllépés" }), 
            { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw fetchError;
      }
    }

    // Check for repetitive content and clean if needed
    if (sceneText && sceneText.trim().length >= 100) {
      const repetitionCheck = detectRepetition(sceneText);
      if (repetitionCheck.isRepetitive) {
        console.warn(`Repetition detected in scene (score: ${repetitionCheck.score.toFixed(2)}), using cleaned text`);
        sceneText = repetitionCheck.cleanedText;
      }
    }

    // Quality check with retry capability
    if (sceneText && sceneText.trim().length >= 100) {
      const qualityResult = checkSceneQuality(sceneText, scene.target_words || 1000);
      if (!qualityResult.passed) {
        console.warn(`Quality issues in scene ${targetSceneIndex + 1}: ${qualityResult.issues.join("; ")}`);
        // Auto-fix: strip markdown if detected
        if (qualityResult.issues.some(i => i.includes("Markdown"))) {
          sceneText = stripMarkdown(sceneText);
          console.log("Auto-stripped markdown from scene content");
        }
        // Quality-based retry (max 1 retry)
        if (qualityResult.shouldRetry) {
          console.log(`Quality retry triggered for scene ${targetSceneIndex + 1}`);
          try {
            const retryPrompt = prompt + buildQualityRetryPrompt(qualityResult.issues);
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), MAX_TIMEOUT);
            const retryRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                max_tokens: 8192,
                temperature: aiSettings.temperature,
                frequency_penalty: aiSettings.frequency_penalty,
                presence_penalty: aiSettings.presence_penalty,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: retryPrompt }
                ]
              }),
              signal: retryController.signal,
            });
            clearTimeout(retryTimeoutId);
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              const retryText = retryData.choices?.[0]?.message?.content || "";
              if (retryText && retryText.trim().length > sceneText.trim().length * 0.8) {
                const retryQuality = checkSceneQuality(retryText, scene.target_words || 1000);
                if (retryQuality.issues.length < qualityResult.issues.length) {
                  console.log(`Quality retry improved: ${qualityResult.issues.length} → ${retryQuality.issues.length} issues`);
                  sceneText = stripMarkdown(retryText);
                } else {
                  console.log("Quality retry did not improve, keeping original");
                }
              }
            }
          } catch (retryErr) {
            console.warn("Quality retry failed, keeping original:", retryErr);
          }
        }
      }
    }

    if (!sceneText || sceneText.trim().length < 100) {
      console.error("All retry attempts failed - no valid content");
      // Mark scene as failed and continue with next
      scenes[targetSceneIndex].status = "failed";
      scenes[targetSceneIndex].error = "AI response failed";
      await supabase.from("chapters").update({ scene_outline: scenes }).eq("id", targetChapter.id);
      return new Response(
        JSON.stringify({ status: "scene_failed", sceneIndex: targetSceneIndex, reason: "AI generation failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get last block sort order
    const { data: lastBlock } = await supabase
      .from("blocks")
      .select("sort_order")
      .eq("chapter_id", targetChapter.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    
    let sortOrder = (lastBlock?.sort_order || 0) + 1;
    
    // Insert paragraphs as blocks
    const paragraphs = sceneText.split(/\n\n+/).filter((p: string) => p.trim());
    if (paragraphs.length) {
      await supabase.from("blocks").insert(
        paragraphs.map((c: string, i: number) => ({ 
          chapter_id: targetChapter.id, 
          type: "paragraph", 
          content: c.trim(), 
          sort_order: sortOrder + i 
        }))
      );
    }

    // Update scene status and chapter word count
    scenes[targetSceneIndex].status = "completed";
    const wordCount = sceneText.split(/\s+/).length;
    const newWordCount = (targetChapter.word_count || 0) + wordCount;
    const allDone = scenes.every((s: any) => s && s.status === "completed");

    await supabase
      .from("chapters")
      .update({
        scene_outline: scenes,
        word_count: newWordCount,
        generation_status: allDone ? "completed" : "in_progress"
      })
      .eq("id", targetChapter.id);

    // If chapter is complete, auto-generate chapter summary for continuity
    if (allDone && !targetChapter.summary) {
      try {
        const allChapterBlocks = await supabase
          .from("blocks")
          .select("content")
          .eq("chapter_id", targetChapter.id)
          .order("sort_order");
        const chapterContent = allChapterBlocks?.data?.map(b => b.content).join("\n\n") || "";
        if (chapterContent.length > 100) {
          const characterNames = charactersResult?.data?.map(c => c.name).join(", ") || "";
          await fetch(`${supabaseUrl}/functions/v1/generate-chapter-summary`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              chapterId: targetChapter.id,
              chapterContent: chapterContent.slice(0, 8000),
              chapterTitle: targetChapter.title,
              genre: project.genre,
              characters: characterNames,
            }),
          });
          console.log(`Auto-generated summary for completed chapter: ${targetChapter.title}`);
        }
      } catch (summaryError) {
        console.warn("Failed to auto-generate chapter summary:", summaryError);
        // Non-critical - don't fail the scene completion
      }
    }

    // Update project total word count
    const totalWords = chapters.reduce((sum, ch) => {
      return sum + (ch.id === targetChapter.id ? newWordCount : (ch.word_count || 0));
    }, 0);
    
    await supabase
      .from("projects")
      .update({ word_count: totalWords })
      .eq("id", projectId);

    // Track usage
    await trackUsage(supabase, project.user_id, wordCount);

    // The client-side poller will handle triggering the next scene
    // No setTimeout needed - client polls and calls process-next-scene

    return new Response(
      JSON.stringify({ 
        status: "scene_completed", 
        chapterId: targetChapter.id, 
        sceneIndex: targetSceneIndex, 
        wordsWritten: wordCount, 
        totalWords 
      }), 
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (e) {
    console.error("Process next scene error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Hiba" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
