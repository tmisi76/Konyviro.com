import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Konstansok
const SCENE_DELAY_MS = 8000; // 8 másodperc scene-ek között
const CHAPTER_DELAY_MS = 15000; // 15 másodperc fejezetek között
const MAX_RETRIES = 15;
const BASE_DELAY_MS = 10000;
const MAX_DELAY_MS = 300000; // 5 perc

// Helper: várakozás
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: exponential backoff delay
const getRetryDelay = (attempt: number) => Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);

// Helper: projekt státusz ellenőrzése
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkProjectStatus(supabase: any, projectId: string): Promise<string | null> {
  const { data } = await supabase
    .from("projects")
    .select("writing_status")
    .eq("id", projectId)
    .single();
  return data?.writing_status || null;
}

// Helper: projekt frissítése
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateProject(supabase: any, projectId: string, updates: Record<string, unknown>) {
  await supabase.from("projects").update({
    ...updates,
    last_activity_at: new Date().toISOString()
  }).eq("id", projectId);
}

// Helper: fejezet frissítése
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateChapter(supabase: any, chapterId: string, updates: Record<string, unknown>) {
  await supabase.from("chapters").update(updates).eq("id", chapterId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Parse request body early to avoid re-parsing issues
  let projectId: string;
  let resumeMode = false;
  
  try {
    const body = await req.json();
    projectId = body.projectId;
    resumeMode = body.resume === true;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!projectId) {
    return new Response(
      JSON.stringify({ error: "projectId is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`Starting book writing process for project: ${projectId}, resume: ${resumeMode}`);

  try {
    // 1. Projekt és fejezetek lekérése
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Projekt nem található");
    }

    // Ellenőrizzük, hogy fut-e már
    if (project.writing_status === 'writing' || project.writing_status === 'generating_outlines') {
      console.log("Writing already in progress, skipping");
      return new Response(JSON.stringify({ message: "Already running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order");

    if (chaptersError || !chapters || chapters.length === 0) {
      throw new Error("Fejezetek nem találhatók");
    }

    // 2. Számítsuk ki a teljes scene számot (becslés ha nincs outline)
    let totalScenes = 0;
    for (const ch of chapters) {
      if (ch.scene_outline && Array.isArray(ch.scene_outline)) {
        totalScenes += ch.scene_outline.length;
      } else {
        // Becsüljük: átlag 5-6 szekció fejezetenként
        totalScenes += 5;
      }
    }

    // 3. Állapot frissítése: generating_outlines
    await updateProject(supabase, projectId, {
      writing_status: 'generating_outlines',
      total_scenes: totalScenes
    });

    // 4. Outline generálás minden fejezethez (ha még nincs)
    console.log("Phase 1: Generating outlines...");
    
    // Készítsük el az előző fejezetek összefoglalóit
    const chapterSummaries: string[] = [];
    
    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
      const chapter = chapters[chapterIndex];
      
      // Ellenőrizzük, hogy szüneteltették-e
      const status = await checkProjectStatus(supabase, projectId);
      if (status === 'paused' || status === 'idle') {
        console.log("Writing paused or cancelled, stopping");
        return new Response(JSON.stringify({ message: "Stopped" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Ha már van outline, ugorjuk át
      if (chapter.scene_outline && Array.isArray(chapter.scene_outline) && chapter.scene_outline.length > 0) {
        console.log(`Chapter ${chapterIndex + 1} already has outline (${chapter.scene_outline.length} scenes), skipping`);
        chapterSummaries.push(chapter.summary || `${chapter.title} - előző fejezet`);
        continue;
      }

      // Outline generálás retry-val
      await updateChapter(supabase, chapter.id, { writing_status: 'generating_outline' });
      await updateProject(supabase, projectId, { current_chapter_index: chapterIndex });

      let outlineSuccess = false;
      for (let attempt = 0; attempt < MAX_RETRIES && !outlineSuccess; attempt++) {
        try {
          console.log(`Generating outline for chapter ${chapterIndex + 1}/${chapters.length}, attempt ${attempt + 1}`);
          
          // Hívjuk a meglévő generate-section-outline edge function-t
          const isNonFiction = project.genre === 'szakkonyv' || project.genre === 'szakkönyv';
          const outlineResponse = await fetch(`${supabaseUrl}/functions/v1/generate-section-outline`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              projectId: projectId,
              chapterId: chapter.id,
              chapterTitle: chapter.title,
              chapterSummary: chapter.summary || chapter.title,
              bookTopic: project.story_idea || project.title,
              targetAudience: project.target_audience || 'Általános',
              genre: isNonFiction ? 'nonfiction' : 'fiction',
              chapterType: project.nonfiction_book_type || null
            })
          });

          if (outlineResponse.status === 429) {
            // Rate limit - várjunk és próbáljuk újra (NEM számít retry-nak)
            const retryAfter = outlineResponse.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000 + Math.random() * 60000;
            console.log(`Rate limited, waiting ${Math.round(delay/1000)}s...`);
            await sleep(delay);
            attempt--; // Ne számítsuk retry-nak
            continue;
          }

          if (!outlineResponse.ok) {
            const errorText = await outlineResponse.text();
            throw new Error(`Outline generation failed: ${errorText}`);
          }

          // Ellenőrizzük, hogy tényleg mentette-e
          const { data: updatedChapter } = await supabase
            .from("chapters")
            .select("scene_outline, summary")
            .eq("id", chapter.id)
            .single();

          if (!updatedChapter?.scene_outline || !Array.isArray(updatedChapter.scene_outline) || updatedChapter.scene_outline.length === 0) {
            throw new Error("Outline not saved to database");
          }

          outlineSuccess = true;
          chapters[chapterIndex] = { ...chapter, scene_outline: updatedChapter.scene_outline };
          chapterSummaries.push(updatedChapter.summary || chapter.title);
          
          await updateChapter(supabase, chapter.id, { writing_status: 'outline_ready' });

          console.log(`✅ Outline generated for chapter ${chapterIndex + 1}: ${updatedChapter.scene_outline.length} scenes`);

        } catch (error) {
          console.error(`Outline attempt ${attempt + 1} failed:`, error);
          if (attempt < MAX_RETRIES - 1) {
            const delay = getRetryDelay(attempt);
            console.log(`Waiting ${Math.round(delay/1000)}s before retry...`);
            await sleep(delay);
          }
        }
      }

      if (!outlineSuccess) {
        // Outline generálás sikertelen - állítsuk le
        await updateProject(supabase, projectId, {
          writing_status: 'failed',
          writing_error: `A "${chapter.title}" fejezet vázlatának generálása sikertelen volt ${MAX_RETRIES} próbálkozás után.`
        });
        
        await updateChapter(supabase, chapter.id, {
          writing_status: 'failed',
          writing_error: 'Outline generálás sikertelen'
        });

        console.error(`❌ Failed to generate outline for chapter ${chapterIndex + 1}`);

        return new Response(JSON.stringify({ error: "Outline generation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Kis szünet fejezetek között
      await sleep(5000);
    }

    // Újraszámoljuk a total scenes-t a tényleges outlines alapján
    totalScenes = chapters.reduce((sum, ch) => {
      const outline = ch.scene_outline;
      return sum + (Array.isArray(outline) ? outline.length : 0);
    }, 0);

    console.log(`All outlines generated. Total scenes: ${totalScenes}`);

    // 5. Állapot frissítése: writing
    await updateProject(supabase, projectId, {
      writing_status: 'writing',
      total_scenes: totalScenes
    });

    // 6. Szekciók írása
    console.log("Phase 2: Writing scenes...");
    
    let completedScenes = resumeMode ? (project.completed_scenes || 0) : 0;
    let failedScenes = resumeMode ? (project.failed_scenes || 0) : 0;
    let runningWordCount = 0;

    // Számoljuk a már meglévő szavakat
    for (const ch of chapters) {
      runningWordCount += ch.word_count || 0;
    }

    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
      const chapter = chapters[chapterIndex];
      
      // Resume mode: skip completed chapters
      if (resumeMode && chapter.writing_status === 'completed') {
        console.log(`Chapter ${chapterIndex + 1} already completed, skipping`);
        continue;
      }

      // Ellenőrizzük, hogy szüneteltették-e
      const status = await checkProjectStatus(supabase, projectId);
      if (status === 'paused' || status === 'idle') {
        console.log("Writing paused or cancelled");
        return new Response(JSON.stringify({ message: "Stopped" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const sceneOutline = chapter.scene_outline || [];
      if (!Array.isArray(sceneOutline) || sceneOutline.length === 0) {
        console.log(`Chapter ${chapterIndex + 1} has no scenes, skipping`);
        continue;
      }

      // Determine starting scene index (for resume)
      let startSceneIndex = 0;
      if (resumeMode && chapter.current_scene_index) {
        startSceneIndex = chapter.current_scene_index;
      }

      await updateChapter(supabase, chapter.id, {
        writing_status: 'writing',
        current_scene_index: startSceneIndex
      });

      await updateProject(supabase, projectId, { current_chapter_index: chapterIndex });

      console.log(`Writing chapter ${chapterIndex + 1}/${chapters.length}: "${chapter.title}" (${sceneOutline.length} scenes, starting at ${startSceneIndex})`);

      // Szekciók írása
      for (let sceneIndex = startSceneIndex; sceneIndex < sceneOutline.length; sceneIndex++) {
        const scene = sceneOutline[sceneIndex];
        
        // Skip null/invalid scenes
        if (!scene || typeof scene !== 'object') {
          console.log(`Skipping invalid scene at index ${sceneIndex}`);
          continue;
        }

        // Ellenőrizzük megint a státuszt
        const checkStatus = await checkProjectStatus(supabase, projectId);
        if (checkStatus === 'paused' || checkStatus === 'idle') {
          console.log("Writing paused mid-chapter");
          return new Response(JSON.stringify({ message: "Stopped" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        console.log(`Writing scene ${sceneIndex + 1}/${sceneOutline.length}: "${scene.title || 'Untitled'}"`);

        let sceneSuccess = false;
        for (let attempt = 0; attempt < MAX_RETRIES && !sceneSuccess; attempt++) {
          try {
            // Hívjuk a meglévő write-section edge function-t
            const writeResponse = await fetch(`${supabaseUrl}/functions/v1/write-section`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
              },
              body: JSON.stringify({
                projectId: projectId,
                chapterId: chapter.id,
                sectionOutline: scene,
                sectionIndex: sceneIndex,
                chapterTitle: chapter.title,
                totalSections: sceneOutline.length,
                projectGenre: project.genre,
                isNonFiction: project.genre === 'szakkonyv' || project.genre === 'szakkönyv'
              })
            });

            if (writeResponse.status === 429) {
              // Rate limit - várjunk (NEM számít retry-nak)
              const retryAfter = writeResponse.headers.get('Retry-After');
              const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000 + Math.random() * 60000;
              console.log(`Rate limited on scene write, waiting ${Math.round(delay/1000)}s...`);
              await sleep(delay);
              attempt--;
              continue;
            }

            if (!writeResponse.ok) {
              const errorText = await writeResponse.text();
              throw new Error(`Scene write failed: ${errorText}`);
            }

            const result = await writeResponse.json();
            const wordCount = result.wordCount || 0;
            runningWordCount += wordCount;
            
            sceneSuccess = true;
            completedScenes++;

            // Frissítsük a progress-t
            await updateChapter(supabase, chapter.id, {
              current_scene_index: sceneIndex + 1,
              scenes_completed: sceneIndex + 1
            });

            await updateProject(supabase, projectId, {
              completed_scenes: completedScenes,
              current_scene_index: sceneIndex,
              word_count: runningWordCount
            });

            console.log(`✅ Scene ${sceneIndex + 1} completed. Words: ${wordCount}, Total: ${runningWordCount}`);

          } catch (error) {
            console.error(`Scene write attempt ${attempt + 1} failed:`, error);
            if (attempt < MAX_RETRIES - 1) {
              const delay = getRetryDelay(attempt);
              console.log(`Waiting ${Math.round(delay/1000)}s before retry...`);
              await sleep(delay);
            }
          }
        }

        if (!sceneSuccess) {
          failedScenes++;
          console.error(`❌ Failed to write scene ${sceneIndex + 1} after ${MAX_RETRIES} attempts`);
          
          await updateProject(supabase, projectId, { failed_scenes: failedScenes });
        }

        // Várakozás a következő scene előtt
        await sleep(SCENE_DELAY_MS);
      }

      // Fejezet kész
      await updateChapter(supabase, chapter.id, { writing_status: 'completed' });

      console.log(`✅ Chapter ${chapterIndex + 1} completed`);

      // Várakozás a következő fejezet előtt
      if (chapterIndex < chapters.length - 1) {
        await sleep(CHAPTER_DELAY_MS);
      }
    }

    // 7. Befejezés
    await updateProject(supabase, projectId, {
      writing_status: 'completed',
      writing_completed_at: new Date().toISOString(),
      completed_scenes: completedScenes,
      failed_scenes: failedScenes,
      word_count: runningWordCount,
      writing_error: failedScenes > 0 ? `${failedScenes} szekció nem sikerült` : null
    });

    console.log(`🎉 Book writing completed! Scenes: ${completedScenes}/${totalScenes}, Failed: ${failedScenes}, Words: ${runningWordCount}`);

    // Küldj email értesítést a befejezésről
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-completion-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ projectId })
      });
    } catch (emailError) {
      console.error("Failed to send completion email:", emailError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      completedScenes,
      failedScenes,
      totalWords: runningWordCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Process error:", error);
    
    // Próbáljuk meg frissíteni a projekt státuszát
    try {
      await supabase.from("projects").update({
        writing_status: 'failed',
        writing_error: error instanceof Error ? error.message : 'Ismeretlen hiba',
        last_activity_at: new Date().toISOString()
      }).eq("id", projectId);
    } catch (e) {
      console.error("Failed to update project status:", e);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Ismeretlen hiba' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
