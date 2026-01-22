import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const SYSTEM_PROMPTS: Record<string, string> = {
  fiction: `Te egy bestseller magyar író vagy. Írj lebilincselő, érzelmekkel teli prózát.
Szabályok:
- Magyarul írj, irodalmi stílusban
- Használj gazdag leírásokat és párbeszédeket
- Tartsd meg a karakterek hangját és személyiségét
- Építs feszültséget és érzelmi mélységet
- A jelenet legyen önmagában is kerek, de illeszkedjen a nagyobb történetbe`,

  erotikus: `Te egy tapasztalt erotikus regényíró vagy. Írj szenvedélyes, érzéki prózát felnőtt olvasóknak.
Szabályok:
- Magyarul írj, irodalmi de érzéki stílusban
- Az intim jelenetek legyenek ízlésesek de expliciten
- Fókuszálj az érzelmekre és a kapcsolatra is
- Használj gazdag szenzoros leírásokat
- A karakterek közötti kémia legyen hiteles`,

  szakkonyv: `Te egy tapasztalt szakkönyvíró vagy. Írj világos, informatív szöveget.
Szabályok:
- Magyarul írj, közérthető stílusban
- Strukturált, logikus felépítés
- Gyakorlati példák és alkalmazások
- Szakmai pontosság közérthető nyelven
- Összefoglalók és kulcspontok kiemelése`,
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

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, profiles!inner(user_id)")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project not found:", projectError);
      return new Response(
        JSON.stringify({ error: "Projekt nem található" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if writing is still in background mode
    if (project.writing_status !== "background_writing") {
      return new Response(
        JSON.stringify({ status: "stopped", message: "Írás leállítva vagy befejezve" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all chapters with their scene outlines
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (chaptersError || !chapters?.length) {
      await supabase
        .from("projects")
        .update({ 
          writing_status: "failed",
          background_error: "Nincsenek fejezetek" 
        })
        .eq("id", projectId);

      return new Response(
        JSON.stringify({ error: "Nincsenek fejezetek" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the next scene to write
    let targetChapter = null;
    let targetSceneIndex = -1;

    for (const chapter of chapters) {
      const scenes = (chapter.scene_outline as any[]) || [];
      for (let i = 0; i < scenes.length; i++) {
        if (scenes[i].status === "pending" || scenes[i].status === "writing") {
          targetChapter = chapter;
          targetSceneIndex = i;
          break;
        }
      }
      if (targetChapter) break;
    }

    // If no more scenes to write, mark as completed
    if (!targetChapter || targetSceneIndex === -1) {
      await supabase
        .from("projects")
        .update({ 
          writing_status: "completed",
          background_error: null 
        })
        .eq("id", projectId);

      // Get user email for notification
      const { data: userData } = await supabase.auth.admin.getUserById(project.user_id);
      const userEmail = userData?.user?.email;

      if (userEmail) {
        // Call email notification function
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-completion-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              email: userEmail,
              projectTitle: project.title,
              projectId: projectId,
            }),
          });
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }
      }

      return new Response(
        JSON.stringify({ status: "completed", message: "Könyv elkészült!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark scene as writing
    const scenes = [...(targetChapter.scene_outline as any[])];
    scenes[targetSceneIndex].status = "writing";
    
    await supabase
      .from("chapters")
      .update({ scene_outline: scenes, generation_status: "in_progress" })
      .eq("id", targetChapter.id);

    // Get previous content for context
    const { data: existingBlocks } = await supabase
      .from("blocks")
      .select("content")
      .eq("chapter_id", targetChapter.id)
      .order("sort_order", { ascending: true });

    const previousContent = existingBlocks?.map(b => b.content).join("\n\n") || "";

    // Determine genre for prompt selection
    const genre = project.genre === "szakkonyv" ? "szakkonyv" : 
                  project.subcategory === "erotikus" ? "erotikus" : "fiction";

    const scene = scenes[targetSceneIndex];
    const systemPrompt = SYSTEM_PROMPTS[genre] || SYSTEM_PROMPTS.fiction;

    // Build user prompt
    let userPrompt = `Írj egy jelenetet a következő vázlat alapján:

Fejezet: ${targetChapter.title}
Jelenet ${targetSceneIndex + 1}/${scenes.length}

POV: ${scene.pov || "Harmadik személy"}
Helyszín: ${scene.location || "Nem meghatározott"}
Időpont: ${scene.time || "Nem meghatározott"}

Leírás: ${scene.description}

Kulcsesemények:
${(scene.key_events || []).map((e: string) => `- ${e}`).join("\n")}

Érzelmi ív: ${scene.emotional_arc || "Nem meghatározott"}

Cél szószám: ~${scene.target_words || 1000} szó`;

    if (previousContent) {
      userPrompt += `\n\nElőző tartalom a fejezetből (folytasd innen):\n${previousContent.slice(-2000)}`;
    }

    if (project.story_structure) {
      userPrompt += `\n\nTörténet struktúra:\n${JSON.stringify(project.story_structure, null, 2)}`;
    }

    // Call AI API with retry logic
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let sceneText = "";
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
            max_tokens: Math.min((scene.target_words || 1000) * 2, 8000),
          }),
        });

        if (response.status === 429) {
          retries++;
          const waitTime = Math.min(30000 * Math.pow(2, retries), 120000);
          console.log(`Rate limited, waiting ${waitTime}ms (retry ${retries}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        sceneText = data.choices?.[0]?.message?.content || "";
        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw error;
        }
        await sleep(10000 * retries);
      }
    }

    if (!sceneText) {
      throw new Error("Nem sikerült szöveget generálni");
    }

    // Get current max sort_order for this chapter
    const { data: lastBlock } = await supabase
      .from("blocks")
      .select("sort_order")
      .eq("chapter_id", targetChapter.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    let sortOrder = (lastBlock?.sort_order || 0) + 1;

    // Split text into paragraphs and save as blocks
    const paragraphs = sceneText.split(/\n\n+/).filter(p => p.trim());
    const blocksToInsert = paragraphs.map((content, index) => ({
      chapter_id: targetChapter.id,
      type: "paragraph",
      content: content.trim(),
      sort_order: sortOrder + index,
    }));

    if (blocksToInsert.length > 0) {
      await supabase.from("blocks").insert(blocksToInsert);
    }

    // Mark scene as completed
    scenes[targetSceneIndex].status = "completed";
    
    // Calculate word count
    const wordCount = sceneText.split(/\s+/).length;
    const newWordCount = (targetChapter.word_count || 0) + wordCount;

    // Check if all scenes in chapter are done
    const allDone = scenes.every((s: any) => s.status === "completed");
    
    await supabase
      .from("chapters")
      .update({ 
        scene_outline: scenes,
        word_count: newWordCount,
        generation_status: allDone ? "completed" : "in_progress"
      })
      .eq("id", targetChapter.id);

    // Update project word count
    const totalWords = chapters.reduce((sum, ch) => {
      if (ch.id === targetChapter.id) {
        return sum + newWordCount;
      }
      return sum + (ch.word_count || 0);
    }, 0);

    await supabase
      .from("projects")
      .update({ word_count: totalWords })
      .eq("id", projectId);

    // Update user_usage - increment words_generated for billing
    try {
      await supabase.rpc('increment_words_generated', {
        p_user_id: project.user_id,
        p_word_count: wordCount
      });
      console.log(`Updated user_usage: +${wordCount} words for user ${project.user_id}`);
    } catch (usageError) {
      console.error('Failed to update word usage:', usageError);
    }

    // Schedule next scene processing (with delay to avoid rate limits)
    // We use a simple approach: return success and let the client poll or use a cron job
    
    return new Response(
      JSON.stringify({ 
        status: "scene_completed",
        chapterId: targetChapter.id,
        sceneIndex: targetSceneIndex,
        wordsWritten: wordCount,
        totalWords: totalWords,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in process-next-scene:", error);
    const message = error instanceof Error ? error.message : "Ismeretlen hiba";
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
