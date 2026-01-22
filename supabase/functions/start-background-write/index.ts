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

    // Get project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already in progress
    if (project.writing_status === "background_writing" || project.writing_status === "in_progress") {
      return new Response(
        JSON.stringify({ error: "Writing is already in progress" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if chapters exist
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("id, title, summary, scene_outline")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (chaptersError || !chapters || chapters.length === 0) {
      return new Response(
        JSON.stringify({ error: "No chapters found for this project" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update project status to background_writing IMMEDIATELY
    // The Dashboard poller will handle outline generation and scene writing
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        writing_mode: "background",
        writing_status: "background_writing",
        background_started_at: new Date().toISOString(),
        background_error: null,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Failed to update project status:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to start background writing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count chapters needing outlines
    const chaptersNeedingOutlines = chapters.filter(
      (ch) => !ch.scene_outline || (Array.isArray(ch.scene_outline) && ch.scene_outline.length === 0)
    ).length;

    console.log(`Background writing started for project ${projectId}. ${chaptersNeedingOutlines} chapters need outlines.`);

    // Return immediately - the Dashboard poller will handle the rest
    return new Response(
      JSON.stringify({
        success: true,
        projectId,
        message: "Háttérben való írás elindítva",
        chaptersTotal: chapters.length,
        chaptersNeedingOutlines,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in start-background-write:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
