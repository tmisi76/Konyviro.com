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
    const { project_id, voice_id } = await req.json();

    if (!project_id || !voice_id) {
      throw new Error("project_id and voice_id are required");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Get chapters for the project
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("id, title, sort_order")
      .eq("project_id", project_id)
      .order("sort_order");

    if (chaptersError) throw chaptersError;
    if (!chapters || chapters.length === 0) {
      throw new Error("No chapters found for this project");
    }

    // Create audiobook record
    const { data: audiobook, error: audiobookError } = await supabase
      .from("audiobooks")
      .insert({
        project_id,
        user_id: user.id,
        voice_id,
        status: "processing",
        total_chapters: chapters.length,
        completed_chapters: 0,
        progress: 0,
      })
      .select()
      .single();

    if (audiobookError) throw audiobookError;

    // Create audiobook_chapters records
    const chapterRecords = chapters.map((chapter, index) => ({
      audiobook_id: audiobook.id,
      chapter_id: chapter.id,
      status: "pending",
      sort_order: index,
    }));

    const { error: insertError } = await supabase
      .from("audiobook_chapters")
      .insert(chapterRecords);

    if (insertError) throw insertError;

    // Trigger first chapter processing
    const firstChapter = chapters[0];
    await supabase.functions.invoke("process-audiobook-chapter", {
      body: {
        audiobook_id: audiobook.id,
        chapter_id: firstChapter.id,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        audiobook_id: audiobook.id,
        total_chapters: chapters.length 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Start audiobook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
