import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId szükséges" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify project exists and get details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title, genre, subcategory, writing_status, generated_story, story_structure, fiction_style, author_profile")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Projekt nem található" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Don't start if already writing
    if (project.writing_status === "background_writing" || project.writing_status === "in_progress") {
      return new Response(
        JSON.stringify({ error: "A könyv írása már folyamatban van" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order");

    if (chaptersError || !chapters || chapters.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nincsenek fejezetek a projektben" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update project to background writing mode
    await supabase
      .from("projects")
      .update({
        writing_mode: "background",
        writing_status: "background_writing",
        background_started_at: new Date().toISOString(),
        background_error: null,
      })
      .eq("id", projectId);

    // Generate scene outlines for chapters that don't have them
    const chaptersNeedingOutline = chapters.filter(
      ch => !ch.scene_outline || (ch.scene_outline as any[]).length === 0
    );

    console.log(`Generating outlines for ${chaptersNeedingOutline.length} chapters`);

    for (let i = 0; i < chaptersNeedingOutline.length; i++) {
      const chapter = chaptersNeedingOutline[i];
      
      try {
        // Get previous chapters context
        const previousChapters = chapters
          .filter(ch => ch.sort_order < chapter.sort_order)
          .map(ch => `${ch.title}: ${ch.summary || ""}`)
          .join("\n");

        // Call generate-detailed-outline edge function
        const outlineResponse = await fetch(
          `${supabaseUrl}/functions/v1/generate-detailed-outline`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              projectId,
              chapterId: chapter.id,
              chapterTitle: chapter.title,
              chapterSummary: chapter.summary,
              storyStructure: project.story_structure,
              genre: project.genre,
              characters: previousChapters,
            }),
          }
        );

        if (!outlineResponse.ok) {
          const errorData = await outlineResponse.json();
          console.error(`Failed to generate outline for chapter ${chapter.id}:`, errorData);
          
          // If rate limited, wait longer
          if (outlineResponse.status === 429) {
            console.log("Rate limited, waiting 10 seconds...");
            await new Promise(resolve => setTimeout(resolve, 10000));
            i--; // Retry this chapter
            continue;
          }
        } else {
          console.log(`Generated outline for chapter: ${chapter.title}`);
        }

        // Wait between chapters to avoid rate limiting (3 seconds)
        if (i < chaptersNeedingOutline.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error(`Error generating outline for chapter ${chapter.id}:`, error);
        // Continue with other chapters
      }
    }

    // Start the first scene processing
    const processResponse = await fetch(`${supabaseUrl}/functions/v1/process-next-scene`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ projectId }),
    });

    if (!processResponse.ok) {
      const errorData = await processResponse.json();
      throw new Error(errorData.error || "Nem sikerült elindítani az írást");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Háttérben való írás elindítva",
        projectId,
        outlinesGenerated: chaptersNeedingOutline.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error starting background write:", error);
    const message = error instanceof Error ? error.message : "Ismeretlen hiba";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
