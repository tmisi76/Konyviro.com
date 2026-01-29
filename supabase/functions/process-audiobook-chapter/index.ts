import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AudiobookChapter {
  chapter_id: string;
  status: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let audiobook_id: string | undefined;
  let chapter_id: string | undefined;

  try {
    const body = await req.json();
    audiobook_id = body.audiobook_id;
    chapter_id = body.chapter_id;

    if (!audiobook_id || !chapter_id) {
      throw new Error("audiobook_id and chapter_id are required");
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    // Get audiobook with voice info
    const { data: audiobook, error: audiobookError } = await supabase
      .from("audiobooks")
      .select(`
        *,
        voice:tts_voices(elevenlabs_voice_id)
      `)
      .eq("id", audiobook_id)
      .single();

    if (audiobookError || !audiobook) {
      throw new Error("Audiobook not found");
    }

    // Update chapter status to processing
    await supabase
      .from("audiobook_chapters")
      .update({ status: "processing" })
      .eq("audiobook_id", audiobook_id)
      .eq("chapter_id", chapter_id);

    // Get chapter content from blocks
    const { data: blocks, error: blocksError } = await supabase
      .from("blocks")
      .select("content")
      .eq("chapter_id", chapter_id)
      .order("sort_order");

    if (blocksError) throw blocksError;

    const { data: chapter } = await supabase
      .from("chapters")
      .select("title")
      .eq("id", chapter_id)
      .single();

    // Combine blocks into chapter text
    const chapterTitle = chapter?.title || "Fejezet";
    // deno-lint-ignore no-explicit-any
    const chapterContent = blocks?.map((b: any) => b.content).join("\n\n") || "";
    const fullText = `${chapterTitle}\n\n${chapterContent}`;

    if (!fullText.trim()) {
      // Mark as completed with no audio if empty
      await supabase
        .from("audiobook_chapters")
        .update({ 
          status: "completed",
          error_message: "Empty chapter"
        })
        .eq("audiobook_id", audiobook_id)
        .eq("chapter_id", chapter_id);

      await processNextChapterInternal(supabase, audiobook_id);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get previous and next chapter text for stitching
    const { data: allChapters } = await supabase
      .from("audiobook_chapters")
      .select("chapter_id, sort_order")
      .eq("audiobook_id", audiobook_id)
      .order("sort_order");

    // deno-lint-ignore no-explicit-any
    const currentIndex = allChapters?.findIndex((c: any) => c.chapter_id === chapter_id) ?? -1;
    let previousText = "";
    let nextText = "";

    if (currentIndex > 0 && allChapters) {
      // deno-lint-ignore no-explicit-any
      const prevChapterId = (allChapters as any[])[currentIndex - 1].chapter_id;
      const { data: prevBlocks } = await supabase
        .from("blocks")
        .select("content")
        .eq("chapter_id", prevChapterId)
        .order("sort_order")
        .limit(2);
      // deno-lint-ignore no-explicit-any
      previousText = prevBlocks?.map((b: any) => b.content).slice(-1).join(" ").slice(-200) || "";
    }

    if (currentIndex < (allChapters?.length ?? 0) - 1 && allChapters) {
      // deno-lint-ignore no-explicit-any
      const nextChapterId = (allChapters as any[])[currentIndex + 1].chapter_id;
      const { data: nextBlocks } = await supabase
        .from("blocks")
        .select("content")
        .eq("chapter_id", nextChapterId)
        .order("sort_order")
        .limit(2);
      // deno-lint-ignore no-explicit-any
      nextText = nextBlocks?.map((b: any) => b.content).slice(0, 1).join(" ").slice(0, 200) || "";
    }

    // Generate audio with ElevenLabs
    const voiceId = audiobook.voice.elevenlabs_voice_id;
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: fullText,
          model_id: "eleven_turbo_v2_5",
          language_code: "hu",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
          previous_text: previousText,
          next_text: nextText,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBlob = new Uint8Array(audioBuffer);

    // Upload to storage
    const fileName = `${audiobook_id}/${chapter_id}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("audiobooks")
      .upload(fileName, audioBlob, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Estimate duration (rough: ~150 words per minute, ~5 chars per word)
    const estimatedDuration = Math.round((fullText.length / 5 / 150) * 60);

    // Update chapter record
    await supabase
      .from("audiobook_chapters")
      .update({
        status: "completed",
        audio_url: fileName,
        duration_seconds: estimatedDuration,
      })
      .eq("audiobook_id", audiobook_id)
      .eq("chapter_id", chapter_id);

    // Process next chapter or complete
    await processNextChapterInternal(supabase, audiobook_id);

    return new Response(
      JSON.stringify({ success: true, duration: estimatedDuration }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Process chapter error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Try to mark chapter as failed
    if (audiobook_id && chapter_id) {
      try {
        await supabase
          .from("audiobook_chapters")
          .update({ 
            status: "failed",
            error_message: message 
          })
          .eq("audiobook_id", audiobook_id)
          .eq("chapter_id", chapter_id);

        // Still try to process next chapter
        await processNextChapterInternal(supabase, audiobook_id);
      } catch {
        // Ignore cleanup errors
      }
    }

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// deno-lint-ignore no-explicit-any
async function processNextChapterInternal(supabase: any, audiobook_id: string) {
  // Get all chapters and their status
  const { data: chapters } = await supabase
    .from("audiobook_chapters")
    .select("chapter_id, status")
    .eq("audiobook_id", audiobook_id)
    .order("sort_order");

  if (!chapters || chapters.length === 0) return;

  const typedChapters = chapters as AudiobookChapter[];
  const completedCount = typedChapters.filter(
    (c) => c.status === "completed" || c.status === "failed"
  ).length;
  const pendingChapter = typedChapters.find((c) => c.status === "pending");

  // Update progress
  const progress = Math.round((completedCount / typedChapters.length) * 100);
  await supabase
    .from("audiobooks")
    .update({
      completed_chapters: completedCount,
      progress,
    })
    .eq("id", audiobook_id);

  if (pendingChapter) {
    // Process next pending chapter
    await supabase.functions.invoke("process-audiobook-chapter", {
      body: {
        audiobook_id,
        chapter_id: pendingChapter.chapter_id,
      },
    });
  } else {
    // All done - update audiobook status
    const allCompleted = typedChapters.every((c) => c.status === "completed");
    await supabase
      .from("audiobooks")
      .update({
        status: allCompleted ? "completed" : "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", audiobook_id);
  }
}
