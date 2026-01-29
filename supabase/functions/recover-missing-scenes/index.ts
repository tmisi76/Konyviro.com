import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SceneOutline {
  title?: string;
  summary?: string;
  description?: string;
}

interface Chapter {
  id: string;
  title: string;
  scene_outline: SceneOutline[] | null;
  scenes_completed: number | null;
  sort_order: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { projectId, action } = await req.json();

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[RECOVER] Starting recovery for project: ${projectId}, action: ${action || 'recover'}`);

    // 1. Projekt lekérése
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Fejezetek lekérése scene_outline-nal
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("id, title, scene_outline, scenes_completed, sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (chaptersError) {
      throw chaptersError;
    }

    if (!chapters || chapters.length === 0) {
      return new Response(JSON.stringify({ 
        error: "No chapters found",
        message: "A projekthez nincsenek fejezetek"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Ellenőrizzük, melyek a hiányos fejezetek
    const incompleteChapters: { chapter: Chapter; missingScenesCount: number; missingIndices: number[] }[] = [];
    
    for (const chapter of chapters as Chapter[]) {
      const sceneOutline = chapter.scene_outline || [];
      const totalScenes = sceneOutline.length;
      const completedScenes = chapter.scenes_completed || 0;
      
      if (totalScenes > 0 && completedScenes < totalScenes) {
        // Meghatározzuk a hiányzó jelenet indexeket
        // Mivel nem tudjuk pontosan, melyik jelenet hiányzik, 
        // feltételezzük, hogy a completedScenes utáni indexek hiányoznak
        const missingIndices: number[] = [];
        for (let i = completedScenes; i < totalScenes; i++) {
          missingIndices.push(i);
        }
        
        incompleteChapters.push({
          chapter,
          missingScenesCount: totalScenes - completedScenes,
          missingIndices
        });
      }
    }

    console.log(`[RECOVER] Found ${incompleteChapters.length} incomplete chapters`);

    if (incompleteChapters.length === 0) {
      // Nincs hiányos fejezet - ellenőrizzük a szószámot
      const { data: chaptersWithWords } = await supabase
        .from("chapters")
        .select("word_count")
        .eq("project_id", projectId);
      
      const totalWords = chaptersWithWords?.reduce((sum, ch) => sum + (ch.word_count || 0), 0) || 0;
      const targetWords = project.target_word_count || 50000;
      const percentage = Math.round((totalWords / targetWords) * 100);

      return new Response(JSON.stringify({ 
        success: true,
        message: `Minden fejezet teljes. Jelenlegi szószám: ${totalWords} (${percentage}%)`,
        totalWords,
        targetWords,
        percentage,
        recoveredScenes: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Töröljük a korábbi failed/pending job-okat ehhez a projekthez (clean slate)
    await supabase
      .from("writing_jobs")
      .delete()
      .eq("project_id", projectId)
      .in("status", ["pending", "failed", "paused"]);

    // 5. Létrehozzuk az új writing job-okat a hiányzó jelenetekhez
    const newJobs: {
      project_id: string;
      chapter_id: string;
      job_type: string;
      status: string;
      scene_index: number;
      scene_outline: SceneOutline;
      priority: number;
      sort_order: number;
    }[] = [];

    for (const { chapter, missingIndices } of incompleteChapters) {
      const sceneOutline = chapter.scene_outline || [];
      
      for (const sceneIndex of missingIndices) {
        if (sceneOutline[sceneIndex]) {
          newJobs.push({
            project_id: projectId,
            chapter_id: chapter.id,
            job_type: 'write_scene',
            status: 'pending',
            scene_index: sceneIndex,
            scene_outline: sceneOutline[sceneIndex],
            priority: 5,
            sort_order: chapter.sort_order * 100 + sceneIndex
          });
        }
      }
    }

    if (newJobs.length > 0) {
      const { error: insertError } = await supabase
        .from("writing_jobs")
        .insert(newJobs);

      if (insertError) {
        throw insertError;
      }
    }

    console.log(`[RECOVER] Created ${newJobs.length} recovery jobs`);

    // 6. Projekt státusz frissítése - újraindítjuk az írást
    await supabase
      .from("projects")
      .update({
        writing_status: 'writing',
        writing_error: null,
        writing_completed_at: null,
        last_activity_at: new Date().toISOString()
      })
      .eq("id", projectId);

    // 7. Fejezetek státuszának frissítése
    for (const { chapter } of incompleteChapters) {
      await supabase
        .from("chapters")
        .update({ writing_status: 'writing' })
        .eq("id", chapter.id);
    }

    // Összesítés
    const totalMissingScenes = incompleteChapters.reduce((sum, ic) => sum + ic.missingScenesCount, 0);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: `Recovery elindítva: ${newJobs.length} jelenet újraírása ${incompleteChapters.length} fejezetben`,
      recoveredScenes: newJobs.length,
      incompleteChaptersCount: incompleteChapters.length,
      totalMissingScenes,
      chapters: incompleteChapters.map(ic => ({
        title: ic.chapter.title,
        missingScenes: ic.missingScenesCount
      }))
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[RECOVER] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
