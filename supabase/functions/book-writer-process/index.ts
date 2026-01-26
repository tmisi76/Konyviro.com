import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Constants
const SCENE_DELAY_MS = 8000;
const CHAPTER_DELAY_MS = 15000;
const MAX_RETRIES = 15;
const BASE_DELAY_MS = 10000;
const MAX_DELAY_MS = 300000;

// Chapter writing statuses for state machine
const ChapterStatus = {
  PENDING: 'pending',
  GENERATING_OUTLINE: 'generating_outline',
  OUTLINE_READY: 'outline_ready',
  WRITING: 'writing',
  DRAFT_COMPLETE: 'draft_complete',
  REVIEWING: 'reviewing',
  REVIEW_COMPLETE: 'review_complete',
  REFINING: 'refining',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped'
} as const;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const getRetryDelay = (attempt: number) => Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkProjectStatus(supabase: any, projectId: string): Promise<string | null> {
  const { data } = await supabase
    .from("projects")
    .select("writing_status")
    .eq("id", projectId)
    .single();
  return data?.writing_status || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateProject(supabase: any, projectId: string, updates: Record<string, unknown>) {
  await supabase.from("projects").update({
    ...updates,
    last_activity_at: new Date().toISOString()
  }).eq("id", projectId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateChapter(supabase: any, chapterId: string, updates: Record<string, unknown>) {
  await supabase.from("chapters").update(updates).eq("id", chapterId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateOutlineForChapter(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  project: any,
  chapter: any,
  chapterIndex: number
): Promise<boolean> {
  await updateChapter(supabase, chapter.id, { writing_status: ChapterStatus.GENERATING_OUTLINE });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`Generating outline for chapter ${chapterIndex + 1}, attempt ${attempt + 1}`);
      
      const isNonFiction = project.genre === 'szakkonyv' || project.genre === 'szakkönyv';
      const outlineResponse = await fetch(`${supabaseUrl}/functions/v1/generate-section-outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          projectId: project.id,
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
        const retryAfter = outlineResponse.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000 + Math.random() * 60000;
        console.log(`Rate limited, waiting ${Math.round(delay/1000)}s...`);
        await sleep(delay);
        attempt--;
        continue;
      }

      if (!outlineResponse.ok) {
        const errorText = await outlineResponse.text();
        throw new Error(`Outline generation failed: ${errorText}`);
      }

      const { data: updatedChapter } = await supabase
        .from("chapters")
        .select("scene_outline, summary")
        .eq("id", chapter.id)
        .single();

      if (!updatedChapter?.scene_outline || !Array.isArray(updatedChapter.scene_outline) || updatedChapter.scene_outline.length === 0) {
        throw new Error("Outline not saved to database");
      }

      await updateChapter(supabase, chapter.id, { writing_status: ChapterStatus.OUTLINE_READY });
      console.log(`✅ Outline generated for chapter ${chapterIndex + 1}: ${updatedChapter.scene_outline.length} scenes`);
      return true;

    } catch (error) {
      console.error(`Outline attempt ${attempt + 1} failed:`, error);
      if (attempt < MAX_RETRIES - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`Waiting ${Math.round(delay/1000)}s before retry...`);
        await sleep(delay);
      }
    }
  }

  await updateChapter(supabase, chapter.id, {
    writing_status: ChapterStatus.FAILED,
    writing_error: 'Outline generálás sikertelen'
  });
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeDraftForChapter(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  project: any,
  chapter: any,
  chapterIndex: number
): Promise<{ success: boolean; completedScenes: number; failedScenes: number; wordCount: number }> {
  const sceneOutline = chapter.scene_outline || [];
  if (!Array.isArray(sceneOutline) || sceneOutline.length === 0) {
    console.log(`Chapter ${chapterIndex + 1} has no scenes, skipping`);
    await updateChapter(supabase, chapter.id, { writing_status: ChapterStatus.SKIPPED });
    return { success: true, completedScenes: 0, failedScenes: 0, wordCount: 0 };
  }

  await updateChapter(supabase, chapter.id, { writing_status: ChapterStatus.WRITING });
  
  let completedScenes = 0;
  let failedScenes = 0;
  let wordCount = 0;
  const startSceneIndex = chapter.current_scene_index || 0;

  console.log(`Writing chapter ${chapterIndex + 1}: "${chapter.title}" (${sceneOutline.length} scenes, starting at ${startSceneIndex})`);

  for (let sceneIndex = startSceneIndex; sceneIndex < sceneOutline.length; sceneIndex++) {
    const scene = sceneOutline[sceneIndex];
    
    if (!scene || typeof scene !== 'object') {
      console.log(`Skipping invalid scene at index ${sceneIndex}`);
      continue;
    }

    const checkStatus = await checkProjectStatus(supabase, project.id);
    if (checkStatus === 'paused' || checkStatus === 'idle') {
      console.log("Writing paused mid-chapter");
      return { success: false, completedScenes, failedScenes, wordCount };
    }

    console.log(`Writing scene ${sceneIndex + 1}/${sceneOutline.length}: "${scene.title || 'Untitled'}"`);

    let sceneSuccess = false;
    for (let attempt = 0; attempt < MAX_RETRIES && !sceneSuccess; attempt++) {
      try {
        const writeResponse = await fetch(`${supabaseUrl}/functions/v1/write-section`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            projectId: project.id,
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
        const sceneWordCount = result.wordCount || 0;
        wordCount += sceneWordCount;
        
        sceneSuccess = true;
        completedScenes++;

        await updateChapter(supabase, chapter.id, {
          current_scene_index: sceneIndex + 1,
          scenes_completed: sceneIndex + 1
        });

        console.log(`✅ Scene ${sceneIndex + 1} completed. Words: ${sceneWordCount}`);

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
    }

    await sleep(SCENE_DELAY_MS);
  }

  // Mark chapter as draft complete
  await updateChapter(supabase, chapter.id, { 
    writing_status: ChapterStatus.DRAFT_COMPLETE,
    word_count: wordCount
  });
  
  console.log(`✅ Chapter ${chapterIndex + 1} draft completed`);
  return { success: true, completedScenes, failedScenes, wordCount };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function reviewChapter(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  chapter: any,
  chapterIndex: number
): Promise<boolean> {
  console.log(`📝 Starting quality review for chapter ${chapterIndex + 1}: "${chapter.title}"`);
  
  await updateChapter(supabase, chapter.id, { writing_status: ChapterStatus.REVIEWING });

  try {
    // Call analyze-chapter-quality function
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-chapter-quality`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ chapter_id: chapter.id })
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      console.log(`Rate limited on review, waiting ${Math.round(delay/1000)}s...`);
      await sleep(delay);
      // Retry once
      const retryResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-chapter-quality`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ chapter_id: chapter.id })
      });
      if (!retryResponse.ok) {
        console.warn(`Quality review failed after retry, continuing...`);
      }
    } else if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Quality review failed: ${errorText}, continuing without review...`);
    }

    await updateChapter(supabase, chapter.id, { writing_status: ChapterStatus.REVIEW_COMPLETE });
    console.log(`✅ Chapter ${chapterIndex + 1} review completed`);
    return true;

  } catch (error) {
    console.error(`Review error for chapter ${chapterIndex + 1}:`, error);
    // Don't fail the whole process, just mark as review complete and continue
    await updateChapter(supabase, chapter.id, { writing_status: ChapterStatus.REVIEW_COMPLETE });
    return true;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function refineChapter(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  chapter: any,
  chapterIndex: number
): Promise<boolean> {
  console.log(`🔧 Starting refinement for chapter ${chapterIndex + 1}: "${chapter.title}"`);
  
  await updateChapter(supabase, chapter.id, { writing_status: ChapterStatus.REFINING });

  try {
    // Check if there are any issues to refine
    const { data: issues } = await supabase
      .from("quality_issues")
      .select("id")
      .eq("chapter_id", chapter.id)
      .limit(1);

    if (!issues || issues.length === 0) {
      console.log(`No issues found for chapter ${chapterIndex + 1}, skipping refinement`);
      await updateChapter(supabase, chapter.id, { writing_status: ChapterStatus.COMPLETED });
      return true;
    }

    // Call refine-chapter function
    const response = await fetch(`${supabaseUrl}/functions/v1/refine-chapter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ chapter_id: chapter.id })
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      console.log(`Rate limited on refinement, waiting ${Math.round(delay/1000)}s...`);
      await sleep(delay);
      // Retry once
      const retryResponse = await fetch(`${supabaseUrl}/functions/v1/refine-chapter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ chapter_id: chapter.id })
      });
      if (!retryResponse.ok) {
        console.warn(`Refinement failed after retry, continuing...`);
      }
    } else if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Refinement failed: ${errorText}, continuing without refinement...`);
    }

    await updateChapter(supabase, chapter.id, { writing_status: ChapterStatus.COMPLETED });
    console.log(`✅ Chapter ${chapterIndex + 1} refinement completed`);
    return true;

  } catch (error) {
    console.error(`Refinement error for chapter ${chapterIndex + 1}:`, error);
    // Don't fail the whole process, just mark as completed
    await updateChapter(supabase, chapter.id, { writing_status: ChapterStatus.COMPLETED });
    return true;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

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

  console.log(`🚀 Starting multi-pass book writing for project: ${projectId}, resume: ${resumeMode}`);

  try {
    // 1. Fetch project and chapters
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Projekt nem található");
    }

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

    // Calculate total scenes
    let totalScenes = 0;
    for (const ch of chapters) {
      if (ch.scene_outline && Array.isArray(ch.scene_outline)) {
        totalScenes += ch.scene_outline.length;
      } else {
        totalScenes += 5; // Estimate
      }
    }

    // Track progress
    let completedScenes = resumeMode ? (project.completed_scenes || 0) : 0;
    let failedScenes = resumeMode ? (project.failed_scenes || 0) : 0;
    let runningWordCount = 0;

    // Count existing word counts
    for (const ch of chapters) {
      runningWordCount += ch.word_count || 0;
    }

    // ============================================
    // PHASE 1: OUTLINE GENERATION
    // ============================================
    console.log("📋 Phase 1: Generating outlines...");
    await updateProject(supabase, projectId, {
      writing_status: 'generating_outlines',
      total_scenes: totalScenes
    });

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      
      const status = await checkProjectStatus(supabase, projectId);
      if (status === 'paused' || status === 'idle') {
        console.log("Writing paused or cancelled");
        return new Response(JSON.stringify({ message: "Stopped" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Skip if already has outline
      if (chapter.scene_outline && Array.isArray(chapter.scene_outline) && chapter.scene_outline.length > 0) {
        console.log(`Chapter ${i + 1} already has outline, skipping`);
        continue;
      }

      const success = await generateOutlineForChapter(supabase, supabaseUrl, supabaseKey, project, chapter, i);
      if (!success) {
        await updateProject(supabase, projectId, {
          writing_status: 'failed',
          writing_error: `A "${chapter.title}" fejezet vázlatának generálása sikertelen.`
        });
        return new Response(JSON.stringify({ error: "Outline generation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      await sleep(5000);
    }

    // Refresh chapters with outlines
    const { data: refreshedChapters } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order");

    // Recalculate total scenes
    totalScenes = refreshedChapters?.reduce((sum, ch) => {
      const outline = ch.scene_outline;
      return sum + (Array.isArray(outline) ? outline.length : 0);
    }, 0) || 0;

    console.log(`✅ All outlines generated. Total scenes: ${totalScenes}`);

    // ============================================
    // PHASE 2: DRAFTING PASS
    // ============================================
    console.log("✍️ Phase 2: Writing drafts...");
    await updateProject(supabase, projectId, {
      writing_status: 'writing',
      total_scenes: totalScenes
    });

    for (let i = 0; i < (refreshedChapters?.length || 0); i++) {
      const chapter = refreshedChapters![i];
      
      const status = await checkProjectStatus(supabase, projectId);
      if (status === 'paused' || status === 'idle') {
        console.log("Writing paused");
        return new Response(JSON.stringify({ message: "Stopped" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Skip if already completed or in later stages
      if ([ChapterStatus.DRAFT_COMPLETE, ChapterStatus.REVIEWING, ChapterStatus.REVIEW_COMPLETE, 
           ChapterStatus.REFINING, ChapterStatus.COMPLETED].includes(chapter.writing_status)) {
        console.log(`Chapter ${i + 1} already past drafting stage, skipping`);
        continue;
      }

      await updateProject(supabase, projectId, { current_chapter_index: i });

      const result = await writeDraftForChapter(supabase, supabaseUrl, supabaseKey, project, chapter, i);
      
      completedScenes += result.completedScenes;
      failedScenes += result.failedScenes;
      runningWordCount += result.wordCount;

      await updateProject(supabase, projectId, {
        completed_scenes: completedScenes,
        failed_scenes: failedScenes,
        word_count: runningWordCount
      });

      if (!result.success) {
        return new Response(JSON.stringify({ message: "Stopped" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (i < (refreshedChapters?.length || 0) - 1) {
        await sleep(CHAPTER_DELAY_MS);
      }
    }

    console.log(`✅ All drafts completed`);

    // ============================================
    // PHASE 3: QUALITY REVIEW PASS
    // ============================================
    console.log("🔍 Phase 3: Quality review...");
    await updateProject(supabase, projectId, { writing_status: 'reviewing' });

    // Get fresh chapter list
    const { data: chaptersForReview } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", projectId)
      .eq("writing_status", ChapterStatus.DRAFT_COMPLETE)
      .order("sort_order");

    for (let i = 0; i < (chaptersForReview?.length || 0); i++) {
      const chapter = chaptersForReview![i];
      
      const status = await checkProjectStatus(supabase, projectId);
      if (status === 'paused' || status === 'idle') {
        console.log("Review paused");
        return new Response(JSON.stringify({ message: "Stopped" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      await reviewChapter(supabase, supabaseUrl, supabaseKey, chapter, i);
      await sleep(5000); // Delay between reviews
    }

    console.log(`✅ Quality review completed`);

    // ============================================
    // PHASE 4: REFINEMENT PASS
    // ============================================
    console.log("🔧 Phase 4: Refinement...");
    await updateProject(supabase, projectId, { writing_status: 'refining' });

    // Get chapters that need refinement
    const { data: chaptersForRefinement } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", projectId)
      .eq("writing_status", ChapterStatus.REVIEW_COMPLETE)
      .order("sort_order");

    for (let i = 0; i < (chaptersForRefinement?.length || 0); i++) {
      const chapter = chaptersForRefinement![i];
      
      const status = await checkProjectStatus(supabase, projectId);
      if (status === 'paused' || status === 'idle') {
        console.log("Refinement paused");
        return new Response(JSON.stringify({ message: "Stopped" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      await refineChapter(supabase, supabaseUrl, supabaseKey, chapter, i);
      await sleep(5000); // Delay between refinements
    }

    console.log(`✅ Refinement completed`);

    // ============================================
    // COMPLETION
    // ============================================
    await updateProject(supabase, projectId, {
      writing_status: 'completed',
      writing_completed_at: new Date().toISOString(),
      completed_scenes: completedScenes,
      failed_scenes: failedScenes,
      word_count: runningWordCount,
      writing_error: failedScenes > 0 ? `${failedScenes} szekció nem sikerült` : null
    });

    console.log(`🎉 Multi-pass book writing completed! Scenes: ${completedScenes}/${totalScenes}, Failed: ${failedScenes}, Words: ${runningWordCount}`);

    // Send completion email
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
      totalWords: runningWordCount,
      phases: ['outlines', 'drafting', 'review', 'refinement']
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Process error:", error);
    
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
