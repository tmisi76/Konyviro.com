import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompts by genre
const SYSTEM_PROMPTS: Record<string, string> = {
  szakkonyv: `Te egy szakkönyv író asszisztens vagy. Strukturált, didaktikus stílusban írj. Használj példákat, magyarázatokat. Kerüld a túl informális nyelvezetet. Magyar nyelven válaszolj.

Fontos irányelvek:
- Használj világos, logikus struktúrát
- Magyarázd el a szakkifejezéseket
- Adj konkrét példákat az elméleti fogalmakhoz
- Hivatkozz forrásokra ahol releváns
- Tartsd meg az akadémiai hangnemet`,

  fiction: `Te egy kreatív író asszisztens vagy. Narratív, leíró stílusban írj. Figyelj a karakterek konzisztenciájára és a cselekmény ívére. Magyar nyelven válaszolj.

Fontos irányelvek:
- Használj élénk, képszerű leírásokat
- Tartsd meg a karakterek egyedi hangját
- Építsd a feszültséget és az érzelmi ívet
- Kerüld a klisés fordulatokat
- Mutass, ne mondj ("show, don't tell")`,

  erotikus: `Te egy felnőtt tartalom író asszisztens vagy. Érzéki, intim stílusban írj. A tartalom lehet explicit, de mindig legyen ízléses és a karakterekhez illő. Magyar nyelven válaszolj.

Fontos irányelvek:
- Építsd az érzelmi és fizikai intimitást fokozatosan
- Használj érzéki, de nem vulgáris nyelvezetet
- Tartsd meg a karakterek egyéniségét az intim jelenetekben is
- Az explicit tartalom legyen a történet szerves része
- Figyelj a beleegyezés és a tisztelet ábrázolására`,
};

// Action-specific instructions
const ACTION_PROMPTS: Record<string, string> = {
  continue: "Folytasd a szöveget természetesen, megtartva a stílust és a narratív irányt.",
  rewrite: "Írd át a megadott szöveget, javítva a stílust és a kifejezésmódot, de megtartva az eredeti jelentést.",
  shorten: "Tömörítsd a szöveget, megtartva a lényeges információkat és a stílust.",
  expand: "Bővítsd ki a szöveget részletesebb leírásokkal, magyarázatokkal vagy párbeszédekkel.",
  dialogue: "Írj természetes, életszerű párbeszédet a karakterek között a megadott kontextus alapján.",
  description: "Írj részletes, érzékletes leírást a megadott témáról vagy jelenetről.",
  chat: "Válaszolj a felhasználó kérdésére vagy kérésére a megadott kontextus figyelembevételével.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action, 
      prompt, 
      context, 
      genre, 
      settings,
      projectId,
      chapterId 
    } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt
    const baseSystemPrompt = SYSTEM_PROMPTS[genre] || SYSTEM_PROMPTS.fiction;
    const actionInstruction = ACTION_PROMPTS[action] || ACTION_PROMPTS.chat;
    
    const systemPrompt = `${baseSystemPrompt}

Aktuális feladat: ${actionInstruction}

${context?.bookDescription ? `Könyv leírása: ${context.bookDescription}` : ""}
${context?.tone ? `Hangnem: ${context.tone}` : ""}
${context?.characters ? `Releváns karakterek:\n${context.characters}` : ""}
${context?.sources ? `Releváns források:\n${context.sources}` : ""}`;

    // Map settings to API parameters
    const temperature = settings?.creativity !== undefined 
      ? settings.creativity / 100 
      : 0.7;
    
    const maxTokensMap: Record<string, number> = {
      short: 250,
      medium: 500,
      long: 1000,
    };
    const maxTokens = maxTokensMap[settings?.length] || 500;

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
    ];

    // Add context content if provided
    if (context?.chapterContent) {
      messages.push({
        role: "user",
        content: `Jelenlegi fejezet tartalma (utolsó rész):\n\n${context.chapterContent}`,
      });
      messages.push({
        role: "assistant", 
        content: "Megértettem a kontextust. Készen állok a folytatásra.",
      });
    }

    // Add the main prompt
    messages.push({ role: "user", content: prompt });

    // Call Lovable AI Gateway with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Túl sok kérés. Kérlek várj egy kicsit és próbáld újra." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredit elfogyott. Kérlek frissítsd az előfizetésedet." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI szolgáltatás hiba" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Track usage in database (async, don't wait)
    const authHeader = req.headers.get("Authorization");
    if (authHeader && projectId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Get user ID from token
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        // We'll estimate tokens - actual tracking would require parsing the full response
        const estimatedPromptTokens = Math.ceil(prompt.length / 4);
        const estimatedCompletionTokens = maxTokens;
        
        // Fire and forget - don't await
        (async () => {
          try {
            await supabase.from("ai_generations").insert({
              user_id: user.id,
              project_id: projectId,
              chapter_id: chapterId || null,
              action_type: action,
              prompt_tokens: estimatedPromptTokens,
              completion_tokens: estimatedCompletionTokens,
              total_tokens: estimatedPromptTokens + estimatedCompletionTokens,
              model: "google/gemini-3-flash-preview",
            });
          } catch (e) {
            console.error("Usage tracking error:", e);
          }
        })();
      }
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Generate error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
