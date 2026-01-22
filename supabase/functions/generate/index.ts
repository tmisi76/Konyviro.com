import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  szakkonyv: `Te egy szakkönyv író asszisztens vagy. Strukturált, didaktikus stílusban írj. Magyar nyelven válaszolj.`,
  fiction: `Te egy kreatív író asszisztens vagy. Narratív, leíró stílusban írj. Magyar nyelven válaszolj.`,
  erotikus: `Te egy felnőtt tartalom író asszisztens vagy. Érzéki, intim stílusban írj. Magyar nyelven válaszolj.`,
};

const ACTION_PROMPTS: Record<string, string> = {
  continue: "Folytasd a szöveget természetesen.",
  rewrite: "Írd át a szöveget javítva a stílust.",
  shorten: "Tömörítsd a szöveget.",
  expand: "Bővítsd ki részletesebben.",
  dialogue: "Írj párbeszédet.",
  description: "Írj leírást.",
  chat: "Válaszolj a kérdésre.",
};

// Build style profile prompt section
const buildStylePrompt = (styleProfile: Record<string, unknown> | null): string => {
  if (!styleProfile || !styleProfile.style_summary) return "";
  
  const parts: string[] = ["\n\n--- FELHASZNÁLÓ ÍRÓI STÍLUSA ---"];
  parts.push(`Stílus összefoglaló: ${styleProfile.style_summary}`);
  
  if (styleProfile.avg_sentence_length) {
    parts.push(`Átlagos mondathossz: ${styleProfile.avg_sentence_length} szó`);
  }
  if (styleProfile.vocabulary_complexity) {
    const complexity = Number(styleProfile.vocabulary_complexity);
    const level = complexity < 30 ? "egyszerű" : complexity < 60 ? "közepes" : "összetett";
    parts.push(`Szókincs komplexitás: ${level}`);
  }
  if (styleProfile.dialogue_ratio) {
    parts.push(`Párbeszéd arány: ${Math.round(Number(styleProfile.dialogue_ratio) * 100)}%`);
  }
  if (styleProfile.common_phrases && Array.isArray(styleProfile.common_phrases) && styleProfile.common_phrases.length > 0) {
    parts.push(`Jellemző kifejezések: ${styleProfile.common_phrases.slice(0, 10).join(", ")}`);
  }
  if (styleProfile.tone_analysis && typeof styleProfile.tone_analysis === "object") {
    const tone = styleProfile.tone_analysis as Record<string, unknown>;
    if (tone.primary) parts.push(`Hangnem: ${tone.primary}`);
  }
  
  parts.push("FONTOS: A fenti stílus jegyeket utánozd a generált szövegben!");
  parts.push("--- STÍLUS VÉGE ---");
  
  return parts.join("\n");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, prompt, context, genre, settings, projectId, chapterId } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch user style profile if useProjectStyle is enabled
    let stylePrompt = "";
    const authHeader = req.headers.get("Authorization");
    if (settings?.useProjectStyle && authHeader) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      
      if (user) {
        const { data: styleProfile } = await supabase
          .from("user_style_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        
        if (styleProfile) {
          stylePrompt = buildStylePrompt(styleProfile);
        }
      }
    }

    const systemPrompt = `${SYSTEM_PROMPTS[genre] || SYSTEM_PROMPTS.fiction}\n\n${ACTION_PROMPTS[action] || ACTION_PROMPTS.chat}${context?.bookDescription ? `\n\nKönyv: ${context.bookDescription}` : ""}${context?.characters ? `\n\nKarakterek: ${context.characters}` : ""}${stylePrompt}`;
    
    const maxTokensMap: Record<string, number> = { short: 500, medium: 2000, long: 6000 };
    const maxTokens = maxTokensMap[settings?.length] || 500;

    const messages = [];
    if (context?.chapterContent) {
      messages.push({ role: "user", content: `Kontextus:\n${context.chapterContent}` });
      messages.push({ role: "assistant", content: "Megértettem." });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Túl sok kérés." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Transform Anthropic SSE to OpenAI-compatible format
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) { controller.close(); return; }
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: parsed.delta.text } }] })}\n\n`));
                }
              } catch {}
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    });

    // Track usage (reuse authHeader from style profile fetch)
    if (authHeader && projectId) {
      const supabaseForTracking = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: { user } } = await supabaseForTracking.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) {
        supabaseForTracking.from("ai_generations").insert({ user_id: user.id, project_id: projectId, chapter_id: chapterId, action_type: action, prompt_tokens: 100, completion_tokens: maxTokens, total_tokens: maxTokens + 100, model: "claude-sonnet-4-5-20250929" }).then(() => {});
      }
    }

    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
