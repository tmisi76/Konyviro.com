import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrchestratorInput {
  projectId: string;
  action: 'start' | 'resume' | 'pause' | 'cancel';
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projectId, action } = await req.json() as OrchestratorInput;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId kötelező" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['start', 'resume', 'pause', 'cancel'].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen action. Használható: start, resume, pause, cancel" }),
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

    // ========== HANDLE ACTIONS ==========

    // PAUSE action
    if (action === 'pause') {
      if (!['writing', 'generating_outlines', 'queued'].includes(project.writing_status)) {
        return new Response(
          JSON.stringify({ error: "A projekt nincs aktív írási állapotban" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("projects").update({
        writing_status: 'paused',
        last_activity_at: new Date().toISOString()
      }).eq("id", projectId);

      console.log(`Project ${projectId} paused by user ${userId}`);

      return new Response(JSON.stringify({ 
        success: true, 
        status: 'paused',
        message: 'A könyvírás szüneteltetve'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // CANCEL action
    if (action === 'cancel') {
      await supabase.from("projects").update({
        writing_status: 'idle',
        writing_error: 'Felhasználó által leállítva',
        last_activity_at: new Date().toISOString()
      }).eq("id", projectId);

      // Reset all chapter statuses
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

    // START action
    if (action === 'start') {
      // Check if already in progress
      if (['writing', 'generating_outlines', 'queued'].includes(project.writing_status)) {
        return new Response(
          JSON.stringify({ error: "A könyvírás már folyamatban van" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get chapters to calculate total scenes
      const { data: chapters } = await supabase
        .from("chapters")
        .select("id, scene_outline")
        .eq("project_id", projectId);

      const totalScenes = chapters?.reduce((sum, ch) => {
        const outline = ch.scene_outline as unknown[];
        return sum + (Array.isArray(outline) ? outline.length : 0);
      }, 0) || 0;

      // Initialize project writing state
      await supabase.from("projects").update({
        writing_status: 'queued',
        writing_started_at: new Date().toISOString(),
        writing_completed_at: null,
        writing_error: null,
        current_chapter_index: 0,
        current_scene_index: 0,
        total_scenes: totalScenes,
        completed_scenes: 0,
        failed_scenes: 0,
        last_activity_at: new Date().toISOString()
      }).eq("id", projectId);

      // Reset all chapters to pending
      await supabase.from("chapters")
        .update({ 
          writing_status: 'pending', 
          writing_error: null,
          current_scene_index: 0,
          scenes_completed: 0
        })
        .eq("project_id", projectId);

      console.log(`Project ${projectId} queued for writing by user ${userId}. Total scenes: ${totalScenes}`);

      // Fire-and-forget: Start the background process
      const processUrl = `${supabaseUrl}/functions/v1/book-writer-process`;
      
      fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ projectId })
      }).catch(err => console.error('Failed to start book-writer-process:', err));

      return new Response(JSON.stringify({
        success: true,
        status: 'started',
        message: 'A könyvírás elindult a háttérben',
        totalScenes
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // RESUME action
    if (action === 'resume') {
      if (project.writing_status !== 'paused' && project.writing_status !== 'failed') {
        return new Response(
          JSON.stringify({ error: "A projekt nem szüneteltetett vagy hibás állapotban van" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("projects").update({
        writing_status: 'queued',
        writing_error: null,
        last_activity_at: new Date().toISOString()
      }).eq("id", projectId);

      console.log(`Project ${projectId} resumed by user ${userId}`);

      // Fire-and-forget: Resume the background process
      const processUrl = `${supabaseUrl}/functions/v1/book-writer-process`;
      
      fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ projectId, resume: true })
      }).catch(err => console.error('Failed to resume book-writer-process:', err));

      return new Response(JSON.stringify({
        success: true,
        status: 'resumed',
        message: 'A könyvírás folytatódik'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    throw new Error('Ismeretlen action');

  } catch (error) {
    console.error("Orchestrator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
