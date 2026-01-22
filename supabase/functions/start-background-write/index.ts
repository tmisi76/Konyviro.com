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

    // Verify project exists and update status
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title, writing_status")
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

    // Update project to background writing mode
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
      throw updateError;
    }

    // Start the first scene processing
    // We call process-next-scene to kick off the chain
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
        projectId 
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
