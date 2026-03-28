import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings } from "../_shared/ai-settings.ts";
import { detectRepetition } from "../_shared/repetition-detector.ts";
import { trackUsage } from "../_shared/usage-tracker.ts";
import {
  GENRE_PROMPTS,
  UNIVERSAL_FICTION_RULES,
  POV_LABELS,
  PACE_LABELS,
  DIALOGUE_LABELS,
  DESCRIPTION_LABELS,
  buildStylePrompt,
  buildFictionStylePrompt,
  buildCharacterNameLock,
  buildPOVEnforcement,
  buildScenePositionContext,
  buildAntiSummaryRules,
  buildDialogueVarietyRules,
  buildAntiRepetitionPrompt,
} from "../_shared/prompt-builder.ts";
import { checkSceneQuality, stripMarkdown, buildQualityRetryPrompt } from "../_shared/quality-checker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Word-compatible counting: only tokens containing at least one letter
const countWords = (t: string) => t.trim().split(/\s+/).filter(w => /[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(w)).length;

// Base prompts
const PROMPTS: Record<string, string> = {
  fiction: "Te egy tehetséges, bestsellereket író regényíró vagy. Írj élénk, képszerű magyar prózát.",
  erotikus: "Te egy tehetséges erotikus regényíró vagy. Írj érzéki, szenvedélyes magyar prózát.",
  szakkonyv: "Te egy szakkönyv szerző vagy. Írj világos, strukturált magyar szöveget.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, chapterId, sceneNumber, sceneOutline, previousContent, characters, storyStructure, genre, chapterTitle, subcategory, targetSceneWords, characterHistory } = await req.json();
    
    if (!projectId || !chapterId || !sceneOutline) {
      return new Response(JSON.stringify({ error: "Hiányzó mezők" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch AI generation settings (temperature, frequency_penalty, presence_penalty)
    const aiSettings = await getAISettings(supabaseUrl, serviceRoleKey);

    // Fetch user style profile and fiction style settings for the project owner
    let stylePrompt = "";
    let fictionStylePrompt = "";
    const { data: project } = await supabase
      .from("projects")
      .select("user_id, fiction_style, subcategory")
      .eq("id", projectId)
      .single();

    // Fetch characters for name lock (parallel with style profile)
    const [styleProfileResult, charactersResult] = await Promise.all([
      project?.user_id
        ? supabase.from("user_style_profiles").select("*").eq("user_id", project.user_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("characters").select("name, role").eq("project_id", projectId),
    ]);

    if (styleProfileResult?.data?.style_summary) {
      stylePrompt = buildStylePrompt(styleProfileResult.data);
    }

    // Add fiction style if available
    const projectSubcategory = subcategory || project?.subcategory;
    if (project?.fiction_style) {
      fictionStylePrompt = buildFictionStylePrompt(project.fiction_style, projectSubcategory);
    }

    const basePrompt = PROMPTS[genre] || PROMPTS.fiction;
    const systemPrompt = basePrompt + fictionStylePrompt + stylePrompt;

    // Calculate effective target words (from request or scene outline)
    const effectiveTargetWords = targetSceneWords || sceneOutline.target_words || 500;
    
    // Dynamic max_tokens based on target (Hungarian: ~1.3 tokens per word)
    const dynamicMaxTokens = Math.min(Math.max(effectiveTargetWords * 2, 1024), 8192);

    // Build character history context if available
    let characterHistoryContext = "";
    if (characterHistory && typeof characterHistory === "object" && Object.keys(characterHistory).length > 0) {
      characterHistoryContext = "\n\n--- KARAKTER ELŐZMÉNYEK ---\nAz alábbi karakterek mit csináltak az előző fejezetekben:\n" +
        Object.entries(characterHistory)
          .map(([name, actions]) => `**${name}**:\n${(actions as string[]).slice(-5).map(a => `- ${a}`).join("\n")}`)
          .join("\n\n") +
        "\n\nFONTOS: Tartsd szem előtt ezeket az előzményeket! A karakterek NE ismételjék meg, amit már megtettek, és NE mutatkozzanak be újra!\n---";
    }

    // Build name lock and POV enforcement
    const nameLock = buildCharacterNameLock(charactersResult?.data || null);
    const povEnforcement = buildPOVEnforcement(
      sceneOutline.pov || null,
      (project?.fiction_style as Record<string, unknown>)?.pov as string || null,
      sceneOutline.pov_character || undefined
    );

    // Scene position context (sceneNumber is 1-based)
    const totalScenes = sceneOutline.total_scenes || 3;
    const chapterIndex = sceneOutline.chapter_index || 0;
    const totalChapters = sceneOutline.total_chapters || 1;
    const scenePositionCtx = buildScenePositionContext(
      sceneNumber - 1,
      totalScenes,
      chapterIndex,
      totalChapters
    );

    // Anti-summary, dialogue variety, anti-repetition rules
    const antiSummary = buildAntiSummaryRules();
    const dialogueVariety = buildDialogueVarietyRules();
    const antiRepetition = buildAntiRepetitionPrompt(previousContent || undefined);

    const prompt = `ÍRD MEG: ${chapterTitle} - Jelenet #${sceneNumber}: "${sceneOutline.title}"

FONTOS: Ez a jelenet MAXIMUM ${effectiveTargetWords} szó legyen! Ne írj többet!

POV: ${sceneOutline.pov}
Helyszín: ${sceneOutline.location}
Mi történik: ${sceneOutline.description}
Kulcsesemények: ${sceneOutline.key_events?.join(", ")}
${sceneOutline.pov_goal ? `POV karakter célja: ${sceneOutline.pov_goal}` : ""}
${sceneOutline.pov_emotion_start ? `Érzelmi állapot a jelenet elején: ${sceneOutline.pov_emotion_start}` : ""}
${sceneOutline.pov_emotion_end ? `Érzelmi állapot a jelenet végén: ${sceneOutline.pov_emotion_end}` : ""}
Célhossz: ~${effectiveTargetWords} szó (NE LÉPD TÚL!)${characters ? `\nKarakterek: ${characters}` : ""}${nameLock}${povEnforcement}${characterHistoryContext}${scenePositionCtx}${antiSummary}${dialogueVariety}${antiRepetition}${previousContent ? `\n\nFolytatás:\n${previousContent.slice(-1500)}` : ""}`;

    // Rock-solid retry logic with max resilience
    const maxRetries = 7;
    const MAX_TIMEOUT = 120000; // 2 minutes timeout
    let lastError: Error | null = null;
    let content = "";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT);

        console.log(`AI request attempt ${attempt}/${maxRetries} for scene ${sceneNumber}`);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            max_tokens: dynamicMaxTokens,
            temperature: aiSettings.temperature,
            frequency_penalty: aiSettings.frequency_penalty,
            presence_penalty: aiSettings.presence_penalty,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limit (429), gateway errors (502/503/504)
        if (response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504 || response.status === 529) {
          const statusText = response.status === 429 ? "Rate limit" : `Gateway ${response.status}`;
          console.error(`${statusText} (attempt ${attempt}/${maxRetries})`);
          
          if (attempt < maxRetries) {
            // Exponential backoff: 5s, 10s, 20s, 40s, 60s, 60s, 60s
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            console.log(`Waiting ${delay/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: "Az AI szolgáltatás túlterhelt. Próbáld újra pár másodperc múlva." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!response.ok) {
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "Nincs elegendő kredit." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const errorText = await response.text();
          console.error("AI gateway error:", response.status, errorText.substring(0, 200));
          
          // Retry on 5xx errors
          if (response.status >= 500 && attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          return new Response(JSON.stringify({ error: "AI szolgáltatás hiba" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Parse response safely
        let aiData;
        try {
          aiData = await response.json();
        } catch (parseError) {
          console.error(`JSON parse error (attempt ${attempt}/${maxRetries}):`, parseError);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Hibás API válasz formátum");
        }

        content = aiData.choices?.[0]?.message?.content || "";

        // Retry on empty or too short response (minimum 100 chars for a valid scene)
        if (!content || content.trim().length < 100) {
          console.warn(`Empty/too short AI response (attempt ${attempt}/${maxRetries}), length: ${content?.length || 0}`);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Az AI nem tudott megfelelő választ generálni");
        }

        // Success - exit retry loop
        console.log(`AI response received, length: ${content.length}`);
        break;

      } catch (fetchError) {
        lastError = fetchError as Error;
        if ((fetchError as Error).name === "AbortError") {
          console.error(`Request timeout after ${MAX_TIMEOUT/1000}s (attempt ${attempt}/${maxRetries})`);
        } else {
          console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
        }
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return new Response(JSON.stringify({ error: "A generálás időtúllépés miatt sikertelen. Próbáld újra." }), {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!content || content.trim().length < 100) {
      console.error("All retry attempts failed:", lastError?.message);
      return new Response(JSON.stringify({ error: "A generálás sikertelen. Próbáld újra." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!content) {
      throw new Error("Generálás sikertelen");
    }

    // Check for repetitive content and clean if needed
    const repetitionCheck = detectRepetition(content);
    if (repetitionCheck.isRepetitive) {
      console.warn(`Repetition detected (score: ${repetitionCheck.score.toFixed(2)}), using cleaned text`);
      content = repetitionCheck.cleanedText;
    }

    // Quality check with retry capability
    const qualityResult = checkSceneQuality(content, effectiveTargetWords);
    if (!qualityResult.passed) {
      console.warn(`Quality issues in scene ${sceneNumber}: ${qualityResult.issues.join("; ")}`);
      if (qualityResult.issues.some(i => i.includes("Markdown"))) {
        content = stripMarkdown(content);
      }
      if (qualityResult.shouldRetry) {
        console.log(`Quality retry triggered for scene ${sceneNumber}`);
        try {
          const retryPrompt = prompt + buildQualityRetryPrompt(qualityResult.issues);
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 120000);
          const retryRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              max_tokens: dynamicMaxTokens,
              temperature: aiSettings.temperature,
              frequency_penalty: aiSettings.frequency_penalty,
              presence_penalty: aiSettings.presence_penalty,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: retryPrompt }
              ]
            }),
            signal: retryController.signal,
          });
          clearTimeout(retryTimeoutId);
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryText = retryData.choices?.[0]?.message?.content || "";
            if (retryText && retryText.trim().length > content.trim().length * 0.8) {
              const retryQuality = checkSceneQuality(retryText, effectiveTargetWords);
              if (retryQuality.issues.length < qualityResult.issues.length) {
                console.log(`Quality retry improved: ${qualityResult.issues.length} → ${retryQuality.issues.length} issues`);
                content = stripMarkdown(retryText);
              }
            }
          }
        } catch (retryErr) {
          console.warn("Quality retry failed, keeping original:", retryErr);
        }
      }
    }

    const wordCount = countWords(content);

    // Update usage
    if (project?.user_id && wordCount > 0) {
      const month = new Date().toISOString().slice(0, 7);
      const { data: profile } = await supabase
        .from("profiles")
        .select("monthly_word_limit, extra_words_balance")
        .eq("user_id", project.user_id)
        .single();
      const { data: usage } = await supabase
        .from("user_usage")
        .select("words_generated")
        .eq("user_id", project.user_id)
        .eq("month", month)
        .single();

      const limit = profile?.monthly_word_limit || 5000;
      const used = usage?.words_generated || 0;
      const extra = profile?.extra_words_balance || 0;
      const remaining = Math.max(0, limit - used);

      // Service role: update usage directly instead of using RPC (which now requires auth.uid())
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (limit === -1 || wordCount <= remaining) {
        // Add to monthly usage
        await supabase.from("user_usage").upsert({
          user_id: project.user_id,
          month: currentMonth,
          words_generated: (usage?.words_generated || 0) + wordCount,
          projects_created: 0
        }, { onConflict: "user_id,month" });
      } else {
        if (remaining > 0) {
          await supabase.from("user_usage").upsert({
            user_id: project.user_id,
            month: currentMonth,
            words_generated: (usage?.words_generated || 0) + remaining,
            projects_created: 0
          }, { onConflict: "user_id,month" });
        }
        const fromExtra = Math.min(wordCount - remaining, extra);
        if (fromExtra > 0) {
          await supabase.from("profiles")
            .update({ extra_words_balance: extra - fromExtra, updated_at: new Date().toISOString() })
            .eq("user_id", project.user_id);
        }
      }
    }

    return new Response(JSON.stringify({ content, wordCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Hiba";
    console.error("Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
