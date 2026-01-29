import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient(supabaseUrl, supabaseKey) as any;
  
  const workerId = `worker-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  try {
    // 1. Oldjuk fel a régen zárolt job-okat (timeout: 5 perc)
    await supabase.from("writing_jobs")
      .update({ status: 'pending', locked_by: null, locked_at: null })
      .eq("status", "processing")
      .lt("locked_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    // 2. Keressünk egy feldolgozandó job-ot (prioritás + sorrend)
    const { data: jobs, error: selectError } = await supabase
      .from("writing_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("next_retry_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(1);

    if (selectError) {
      console.error("Job select error:", selectError);
      throw selectError;
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No pending jobs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const job = jobs[0];

    // 3. Lock a job-ot (optimistic locking)
    const { error: lockError } = await supabase
      .from("writing_jobs")
      .update({ 
        status: 'processing', 
        locked_by: workerId, 
        locked_at: new Date().toISOString(),
        started_at: job.started_at || new Date().toISOString()
      })
      .eq("id", job.id)
      .eq("status", "pending");

    if (lockError) {
      console.error("Job lock error:", lockError);
      return new Response(JSON.stringify({ message: "Failed to lock job" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Processing job ${job.id} (${job.job_type}) for project ${job.project_id}`);

    // 4. Projekt és fejezet adatok lekérése
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", job.project_id)
      .single();

    const { data: chapter } = await supabase
      .from("chapters")
      .select("*")
      .eq("id", job.chapter_id)
      .single();

    if (!project || !chapter) {
      throw new Error("Projekt vagy fejezet nem található");
    }

    // Ellenőrizzük, hogy a projekt nincs-e pause-olva
    if (project.writing_status === 'paused' || project.writing_status === 'idle') {
      await supabase.from("writing_jobs")
        .update({ status: 'paused', locked_by: null, locked_at: null })
        .eq("id", job.id);
      
      return new Response(JSON.stringify({ message: "Project paused" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Job típus alapján feldolgozás
    let success = false;
    let errorMessage: string | null = null;

    try {
      if (job.job_type === 'generate_outline') {
        success = await processOutlineJob(supabase, job, project, chapter);
      } else if (job.job_type === 'write_scene') {
        success = await processSceneJob(supabase, job, project, chapter);
      }
    } catch (error) {
      console.error(`Job ${job.id} error:`, error);
      errorMessage = error instanceof Error ? error.message : String(error);
      
      // Rate limit kezelés - hosszú várakozás
      if (errorMessage?.includes('429') || errorMessage?.toLowerCase().includes('rate')) {
        const retryDelay = 60000 + Math.random() * 60000; // 60-120 másodperc
        await supabase.from("writing_jobs")
          .update({ 
            status: 'pending',
            locked_by: null,
            locked_at: null,
            next_retry_at: new Date(Date.now() + retryDelay).toISOString(),
            last_error: 'Rate limited, retrying...'
          })
          .eq("id", job.id);
        
        return new Response(JSON.stringify({ message: "Rate limited, will retry" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 6. Job státusz frissítése
    if (success) {
      await supabase.from("writing_jobs")
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null
        })
        .eq("id", job.id);

      // Projekt progress frissítése
      await updateProjectProgress(supabase, job.project_id);
    } else {
      // Retry vagy fail
      const newAttempts = (job.attempts || 0) + 1;
      
      if (newAttempts >= (job.max_attempts || 15)) {
        await supabase.from("writing_jobs")
          .update({ 
            status: 'failed',
            last_error: errorMessage || 'Max attempts reached',
            locked_by: null,
            locked_at: null
          })
          .eq("id", job.id);

        // Projekt failed_scenes növelése
        await supabase.from("projects")
          .update({ 
            failed_scenes: (project.failed_scenes || 0) + 1,
            last_activity_at: new Date().toISOString()
          })
          .eq("id", job.project_id);
      } else {
        // Exponential backoff (10s -> 20s -> 40s -> ... max 5 perc)
        const retryDelay = Math.min(10000 * Math.pow(2, newAttempts), 300000);
        
        await supabase.from("writing_jobs")
          .update({ 
            status: 'pending',
            attempts: newAttempts,
            last_error: errorMessage,
            next_retry_at: new Date(Date.now() + retryDelay).toISOString(),
            locked_by: null,
            locked_at: null
          })
          .eq("id", job.id);
      }
    }

    return new Response(JSON.stringify({ 
      success,
      jobId: job.id,
      jobType: job.job_type
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Process job error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Outline generálás - meghívja a generate-section-outline edge function-t
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processOutlineJob(supabase: any, job: any, project: any, chapter: any): Promise<boolean> {
  console.log(`Generating outline for chapter: ${chapter.title}`);
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-section-outline`, {
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
      genre: project.genre,
      bookTopic: project.title,
      targetAudience: project.target_audience || 'általános olvasók',
      chapterType: 'content'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Outline generation failed: ${errorText}`);
  }

  // Ellenőrizzük, hogy mentve lett-e az outline
  const { data: updatedChapter } = await supabase
    .from("chapters")
    .select("scene_outline")
    .eq("id", chapter.id)
    .single();

  const sceneOutline = updatedChapter?.scene_outline || [];
  if (!sceneOutline || sceneOutline.length === 0) {
    throw new Error("Outline not saved");
  }

  // Hozzuk létre a scene írási job-okat
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sceneJobs = sceneOutline.map((scene: any, index: number) => ({
    project_id: project.id,
    chapter_id: chapter.id,
    job_type: 'write_scene',
    status: 'pending',
    scene_index: index,
    scene_outline: scene,
    priority: 5,
    sort_order: (job.sort_order || 0) * 100 + index,
  }));

  await supabase.from("writing_jobs").insert(sceneJobs);

  // Fejezet státusz frissítése
  await supabase.from("chapters")
    .update({ writing_status: 'outline_ready' })
    .eq("id", chapter.id);

  // Total scenes és projekt státusz frissítése
  await supabase.from("projects")
    .update({ 
      total_scenes: (project.total_scenes || 0) + sceneOutline.length,
      writing_status: 'writing',
      last_activity_at: new Date().toISOString()
    })
    .eq("id", project.id);

  console.log(`Created ${sceneJobs.length} scene jobs for chapter ${chapter.title}`);
  return true;
}

// Scene írás - meghívja a write-section edge function-t
// ATOMIKUS verzió - append_chapter_content RPC-t használ a race condition elkerüléséhez
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processSceneJob(supabase: any, job: any, project: any, chapter: any): Promise<boolean> {
  const sceneIndex = job.scene_index;
  
  console.log(`Writing scene ${sceneIndex + 1} for chapter: ${chapter.title}`);
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const sceneOutlineArray = chapter.scene_outline || [];
  
  const response = await fetch(`${supabaseUrl}/functions/v1/write-section`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      projectId: project.id,
      chapterId: chapter.id,
      sectionOutline: job.scene_outline,
      sectionIndex: sceneIndex,
      chapterTitle: chapter.title,
      totalSections: sceneOutlineArray.length || 1,
      previousContent: ""
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Scene write failed: ${errorText}`);
  }

  const result = await response.json();
  const sceneContent = result.content || "";
  const wordCount = result.wordCount || 0;
  
  // ATOMIKUS content hozzáfűzés - RPC-vel, row-level lock-kal
  // Ez megakadályozza, hogy párhuzamos scene írások felülírják egymást
  const { error: rpcError } = await supabase.rpc('append_chapter_content', {
    p_chapter_id: chapter.id,
    p_new_content: sceneContent,
    p_word_count_delta: wordCount
  });

  if (rpcError) {
    console.error("append_chapter_content RPC error:", rpcError);
    throw new Error(`Failed to append content: ${rpcError.message}`);
  }

  console.log(`Scene ${sceneIndex + 1} completed with ${wordCount} words (atomic append)`);
  return true;
}

// Projekt progress frissítése - JAVÍTOTT verzió szószám validációval
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateProjectProgress(supabase: any, projectId: string) {
  // Számoljuk a completed scene job-okat
  const { count: completedCount } = await supabase
    .from("writing_jobs")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId)
    .eq("status", "completed")
    .eq("job_type", "write_scene");

  const { count: totalCount } = await supabase
    .from("writing_jobs")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId)
    .eq("job_type", "write_scene");

  const { count: pendingCount } = await supabase
    .from("writing_jobs")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId)
    .in("status", ["pending", "processing"]);

  // Számoljuk a teljes word count-ot a chapters táblából
  const { data: chapters } = await supabase
    .from("chapters")
    .select("word_count")
    .eq("project_id", projectId);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalWords = chapters?.reduce((sum: number, ch: any) => sum + (ch.word_count || 0), 0) || 0;

  // Projekt target word count lekérése
  const { data: project } = await supabase
    .from("projects")
    .select("target_word_count")
    .eq("id", projectId)
    .single();

  const targetWordCount = project?.target_word_count || 50000;
  
  // JAVÍTOTT befejezési logika:
  // 1. Nincs pending job
  // 2. ÉS a szószám eléri a cél 70%-át (megelőzi a hamis completed státuszt)
  const noMoreJobs = pendingCount === 0;
  const hasReachedWordTarget = totalWords >= targetWordCount * 0.7;
  const isActuallyCompleted = noMoreJobs && hasReachedWordTarget;
  
  // Ha nincs több job de nem értük el a célt, loggoljuk
  if (noMoreJobs && !hasReachedWordTarget) {
    console.warn(`Project ${projectId}: No pending jobs but word count (${totalWords}) is below 70% of target (${targetWordCount}). Status: incomplete`);
  }
  
  // Ha most fejeződött be TÉNYLEGESEN, küldjünk email értesítést
  if (isActuallyCompleted) {
    const hasContent = chapters?.some((ch: { word_count?: number }) => (ch.word_count || 0) > 0);
    
    if (hasContent && totalWords > 0) {
      await sendCompletionEmail(supabase, projectId);
    } else {
      console.warn(`Project ${projectId} completed but has no content - skipping email`);
    }
  }
  
  await supabase.from("projects").update({
    completed_scenes: completedCount || 0,
    total_scenes: totalCount || 0,
    word_count: totalWords,
    writing_status: isActuallyCompleted ? 'completed' : (noMoreJobs ? 'incomplete' : 'writing'),
    writing_completed_at: isActuallyCompleted ? new Date().toISOString() : null,
    last_activity_at: new Date().toISOString()
  }).eq("id", projectId);
}

// Email küldése a könyv befejezésekor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendCompletionEmail(supabase: any, projectId: string) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Projekt és user adatok lekérése
    const { data: project } = await supabase
      .from("projects")
      .select("title, user_id")
      .eq("id", projectId)
      .single();
    
    if (!project?.user_id) {
      console.error("Project or user not found for email");
      return;
    }
    
    // User email lekérése az auth.users táblából
    const { data: userData } = await supabase.auth.admin.getUserById(project.user_id);
    
    if (!userData?.user?.email) {
      console.error("User email not found");
      return;
    }
    
    // Email küldése
    console.log(`Sending completion email to ${userData.user.email} for project "${project.title}"`);
    
    await fetch(`${supabaseUrl}/functions/v1/send-completion-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        email: userData.user.email,
        projectTitle: project.title,
        projectId: projectId
      })
    });
    
    console.log("Completion email sent successfully");
  } catch (error) {
    // Ne dobjunk hibát, csak loggoljuk - az email küldés nem kritikus
    console.error("Failed to send completion email:", error);
  }
}
