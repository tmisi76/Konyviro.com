import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title, genre, writing_status, generated_story, target_audience")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if still in background_writing mode
    if (project.writing_status !== "background_writing") {
      return new Response(
        JSON.stringify({ status: "stopped", message: "Writing is not in progress" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all chapters ordered
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("id, title, summary, scene_outline, sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (chaptersError || !chapters || chapters.length === 0) {
      return new Response(
        JSON.stringify({ error: "No chapters found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find first chapter without scene_outline
    const chapterNeedingOutline = chapters.find(
      (ch) => !ch.scene_outline || (Array.isArray(ch.scene_outline) && ch.scene_outline.length === 0)
    );

    if (!chapterNeedingOutline) {
      // All outlines are complete
      return new Response(
        JSON.stringify({
          status: "outlines_complete",
          message: "All chapter outlines are ready",
          totalChapters: chapters.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get previous chapters for context
    const previousChapters = chapters
      .filter((ch) => ch.sort_order < chapterNeedingOutline.sort_order)
      .map((ch) => ({ title: ch.title, summary: ch.summary }));

    console.log(`Generating outline for chapter: ${chapterNeedingOutline.title}`);

    // Call generate-detailed-outline for this chapter
    const outlineResponse = await fetch(`${supabaseUrl}/functions/v1/generate-detailed-outline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        chapterId: chapterNeedingOutline.id,
        chapterTitle: chapterNeedingOutline.title,
        chapterSummary: chapterNeedingOutline.summary,
        storyStructure: project.generated_story,
        genre: project.genre,
        previousChapters,
      }),
    });

    if (!outlineResponse.ok) {
      const errorText = await outlineResponse.text();
      console.error(`Failed to generate outline for chapter ${chapterNeedingOutline.id}:`, errorText);
      
      // Don't fail the whole process, just report error
      return new Response(
        JSON.stringify({
          status: "outline_error",
          chapterId: chapterNeedingOutline.id,
          chapterTitle: chapterNeedingOutline.title,
          error: errorText,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const outlineResult = await outlineResponse.json();
    console.log(`Generated outline for chapter: ${chapterNeedingOutline.title}`);

    // Calculate progress
    const completedOutlines = chapters.filter(
      (ch) => ch.scene_outline && Array.isArray(ch.scene_outline) && ch.scene_outline.length > 0
    ).length + 1; // +1 for the one we just completed

    return new Response(
      JSON.stringify({
        status: "outline_generated",
        chapterId: chapterNeedingOutline.id,
        chapterTitle: chapterNeedingOutline.title,
        completedOutlines,
        totalChapters: chapters.length,
        hasMore: completedOutlines < chapters.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-next-outline:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
