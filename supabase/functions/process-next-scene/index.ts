import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { 
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" 
};

const HUNGARIAN_GRAMMAR_RULES = `

## MAGYAR NYELVI SZABÁLYOK (KÖTELEZŐ):

NÉVSORREND: Magyar névsorrend: Vezetéknév + Keresztnév (pl. "Kovács János", NEM "János Kovács").

PÁRBESZÉD FORMÁZÁS:
- Magyar párbeszédjelölés: gondolatjel (–) a sor elején
- Idézőjel használata: „..." (magyar idézőjel, NEM "...")
- Példa helyes formátum:
  – Hová mész? – kérdezte Anna.
  – A boltba – válaszolta.

ÍRÁSJELEK:
- Gondolatjel: – (hosszú, NEM -)
- Három pont: ... (NEM …)
- Vessző MINDIG a kötőszavak előtt: "de, hogy, mert, ha, amikor, amely, ami"

KERÜLENDŐ HIBÁK:
- NE használj angolszász névsorrendet
- NE használj tükörfordításokat ("ez csinál értelmet" → "ennek van értelme")
- NE használj angol idézőjeleket ("..." → „...")
- NE használj felesleges névelőket angolosan

NYELVTANI HELYESSÉG:
- Ragozás: ügyelj a magyar ragozás helyességére
- Szórend: magyar szórend, NEM angol (ige-alany-tárgy)
- Összetett szavak: egybe vagy külön az MTA szabályai szerint
`;

const NO_MARKDOWN_RULE = `

FORMÁZÁSI SZABÁLY (KÖTELEZŐ):
- NE használj markdown jelölőket (**, ##, ***, ---, \`\`\`, stb.)
- Címsorokhoz használj normál mondatformátumot új sorban (NEM csupa nagybetűt)
- TILOS a CSUPA NAGYBETŰS írás (kivéve rövidítések: EU, AI, stb.)
- Írj tiszta, folyamatos prózát jelölések nélkül
`;

const PROMPTS: Record<string, string> = {
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

    // Get project - no inner join, just simple query
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title, genre, subcategory, user_id, writing_status, story_structure, generated_story")
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

    // Get chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order");
    
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
      // Jelöljük a jelenetet hibásnak és lépjünk tovább
      scenes[targetSceneIndex] = { status: "skipped", error: "Invalid scene data" };
      await supabase.from("chapters").update({ scene_outline: scenes }).eq("id", targetChapter.id);
      return new Response(
        JSON.stringify({ status: "scene_skipped", sceneIndex: targetSceneIndex, reason: "Invalid scene data" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const prompt = `Írj jelenetet:
Fejezet: ${targetChapter.title}
Jelenet ${targetSceneIndex + 1}/${scenes.length}
POV: ${scene.pov || "Harmadik személy"}
Helyszín: ${scene.location || "Ismeretlen"}
Leírás: ${scene.description || "Folytasd a történetet"}
Kulcsesemények: ${(scene.key_events || []).join(", ") || "Folytasd a cselekményt"}
Cél: ~${scene.target_words || 1000} szó
${prevContent ? `\n\nFolytasd:\n${prevContent.slice(-2000)}` : ""}`;

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
            messages: [
              { role: "system", content: PROMPTS[genre] },
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
    const allDone = scenes.every((s: any) => s.status === "completed");
    
    await supabase
      .from("chapters")
      .update({ 
        scene_outline: scenes, 
        word_count: newWordCount, 
        generation_status: allDone ? "completed" : "in_progress" 
      })
      .eq("id", targetChapter.id);

    // Update project total word count
    const totalWords = chapters.reduce((sum, ch) => {
      return sum + (ch.id === targetChapter.id ? newWordCount : (ch.word_count || 0));
    }, 0);
    
    await supabase
      .from("projects")
      .update({ word_count: totalWords })
      .eq("id", projectId);

    // Track usage
    const month = new Date().toISOString().slice(0, 7);
    const { data: profile } = await supabase
      .from("profiles")
      .select("monthly_word_limit, extra_words_balance")
      .eq("user_id", project.user_id)
      .single();
    
    const { data: usage } = await supabase
      .from("user_usage")
      .select("words_generated")
      .eq("user_id", project.user_id)
      .eq("month", month)
      .single();
    
    const limit = profile?.monthly_word_limit || 5000;
    const used = usage?.words_generated || 0;
    const extra = profile?.extra_words_balance || 0;
    const remaining = Math.max(0, limit - used);
    
    // Service role: update usage directly instead of using RPC (which now requires auth.uid())
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (limit === -1 || wordCount <= remaining) {
      await supabase.from("user_usage").upsert({
        user_id: project.user_id,
        month: currentMonth,
        words_generated: used + wordCount,
        projects_created: 0
      }, { onConflict: "user_id,month" });
    } else {
      if (remaining > 0) {
        await supabase.from("user_usage").upsert({
          user_id: project.user_id,
          month: currentMonth,
          words_generated: used + remaining,
          projects_created: 0
        }, { onConflict: "user_id,month" });
      }
      const fromExtra = Math.min(wordCount - remaining, extra);
      if (fromExtra > 0) {
        await supabase.from("profiles")
          .update({ extra_words_balance: extra - fromExtra, updated_at: new Date().toISOString() })
          .eq("user_id", project.user_id);
      }
    }

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
