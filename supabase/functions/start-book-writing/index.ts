import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StartWritingRequest {
  projectId: string;
  action: 'start' | 'pause' | 'resume' | 'cancel';
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projectId, action } = await req.json() as StartWritingRequest;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId kötelező" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== AUTHENTICATION ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Nincs jogosultság" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user token
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Service client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== GET PROJECT & VERIFY OWNERSHIP ==========
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Projekt nem található" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (project.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Nincs jogosultságod ehhez a projekthez" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== PAUSE ACTION ==========
    if (action === 'pause') {
      await supabase.from("projects").update({
        writing_status: 'paused',
        last_activity_at: new Date().toISOString()
      }).eq("id", projectId);

      // Pause pending jobs
      await supabase.from("writing_jobs")
        .update({ status: 'paused' })
        .eq("project_id", projectId)
        .eq("status", "pending");

      console.log(`Project ${projectId} paused by user ${userId}`);

      return new Response(JSON.stringify({
        success: true,
        status: 'paused',
        message: 'A könyvírás szüneteltetve'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ========== RESUME ACTION ==========
    if (action === 'resume') {
      await supabase.from("projects").update({
        writing_status: 'writing',
        last_activity_at: new Date().toISOString()
      }).eq("id", projectId);

      // Resume paused jobs
      await supabase.from("writing_jobs")
        .update({ status: 'pending', next_retry_at: new Date().toISOString() })
        .eq("project_id", projectId)
        .eq("status", "paused");

      console.log(`Project ${projectId} resumed by user ${userId}`);

      return new Response(JSON.stringify({
        success: true,
        status: 'resumed',
        message: 'A könyvírás folytatódik'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ========== CANCEL ACTION ==========
    if (action === 'cancel') {
      await supabase.from("projects").update({
        writing_status: 'idle',
        writing_error: 'Felhasználó által leállítva',
        last_activity_at: new Date().toISOString()
      }).eq("id", projectId);

      // Delete all jobs
      await supabase.from("writing_jobs")
        .delete()
        .eq("project_id", projectId);

      // Reset chapter statuses
      await supabase.from("chapters")
        .update({ writing_status: 'pending', writing_error: null })
        .eq("project_id", projectId);

      console.log(`Project ${projectId} cancelled by user ${userId}`);

      return new Response(JSON.stringify({
        success: true,
        status: 'cancelled',
        message: 'A könyvírás leállítva'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ========== START ACTION ==========
    if (action === 'start') {
      // Check if there are actually active jobs (not just status)
      const { count: existingJobs } = await supabase
        .from("writing_jobs")
        .select("*", { count: 'exact', head: true })
        .eq("project_id", projectId)
        .in("status", ["pending", "processing"]);

      // If there are active jobs, don't allow restart
      if (existingJobs && existingJobs > 0) {
        return new Response(
          JSON.stringify({ error: "A könyvírás már folyamatban van" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get chapters
      const { data: chapters, error: chaptersError } = await supabase
        .from("chapters")
        .select("id, title, sort_order, scene_outline")
        .eq("project_id", projectId)
        .order("sort_order");

      if (chaptersError || !chapters || chapters.length === 0) {
        return new Response(
          JSON.stringify({ error: "Nincsenek fejezetek a projektben" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Processing ${chapters.length} chapters for project ${projectId}`);

      // Delete old jobs if any
      await supabase.from("writing_jobs")
        .delete()
        .eq("project_id", projectId);

      // Create jobs for each chapter
      const jobs: Array<{
        project_id: string;
        chapter_id: string;
        job_type: string;
        status: string;
        priority: number;
        sort_order: number;
        scene_index?: number;
        scene_outline?: unknown;
      }> = [];
      
      let totalScenes = 0;
      let sortOrder = 0;

      for (const chapter of chapters) {
        const sceneOutline = (chapter.scene_outline as unknown[]) || [];
        const hasOutline = Array.isArray(sceneOutline) && sceneOutline.length > 0;
        
        console.log(`Chapter "${chapter.title}": has outline = ${hasOutline}, scenes = ${sceneOutline.length}`);

        // If no outline, create outline generation job first
        if (!hasOutline) {
          jobs.push({
            project_id: projectId,
            chapter_id: chapter.id,
            job_type: 'generate_outline',
            status: 'pending',
            priority: 10, // Higher priority for outlines
            sort_order: sortOrder++,
          });
          
          // Estimate 5 scenes per chapter without outline
          totalScenes += 5;
        } else {
          // Create scene writing jobs only if has outline
          for (let i = 0; i < sceneOutline.length; i++) {
            const scene = sceneOutline[i];
            if (!scene) continue; // Skip null scenes
            
            jobs.push({
              project_id: projectId,
              chapter_id: chapter.id,
              job_type: 'write_scene',
              status: 'pending',
              scene_index: i,
              scene_outline: scene,
              priority: 5,
              sort_order: sortOrder++,
            });
          }
          totalScenes += sceneOutline.filter(Boolean).length;
        }
      }
      
      console.log(`Total jobs to create: ${jobs.length}, estimated scenes: ${totalScenes}`);

      // Insert jobs
      if (jobs.length > 0) {
        const { error: insertError } = await supabase
          .from("writing_jobs")
          .insert(jobs);

        if (insertError) {
          console.error("Job insert error:", insertError);
          return new Response(
            JSON.stringify({ error: "Nem sikerült létrehozni a feladatokat" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Update project status
      await supabase.from("projects").update({
        writing_status: 'generating_outlines',
        writing_started_at: new Date().toISOString(),
        writing_completed_at: null,
        total_scenes: totalScenes,
        completed_scenes: 0,
        failed_scenes: 0,
        writing_error: null,
        last_activity_at: new Date().toISOString()
      }).eq("id", projectId);

      // Reset chapter statuses
      await supabase.from("chapters")
        .update({
          writing_status: 'pending',
          writing_error: null,
          scenes_completed: 0,
          current_scene_index: 0
        })
        .eq("project_id", projectId);

      console.log(`Created ${jobs.length} jobs for project ${projectId} by user ${userId}. Total scenes: ${totalScenes}`);

      return new Response(JSON.stringify({
        success: true,
        status: 'started',
        message: 'A könyvírás elindult',
        jobsCreated: jobs.length,
        totalScenes
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({ error: "Ismeretlen action. Használható: start, pause, resume, cancel" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Start writing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
