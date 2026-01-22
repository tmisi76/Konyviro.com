import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Count words in text
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Parse SSE stream and extract text content
const parseSSEStream = async (response: Response): Promise<string> => {
  const reader = response.body?.getReader();
  if (!reader) return "";
  
  const decoder = new TextDecoder();
  let fullText = "";
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");
    
    for (const line of lines) {
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const json = JSON.parse(line.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
  
  return fullText;
};

// Genre-specific system prompts
const SYSTEM_PROMPTS: Record<string, string> = {
  fiction: `Te egy bestseller regényíró vagy. Feladatod, hogy a megadott jelenet-vázlat alapján megírd a jelenet teljes szövegét.

ÍRÁSI SZABÁLYOK:
- Használj élénk, képszerű leírásokat
- "Show, don't tell" - mutass, ne mondj
- A karakterek beszédstílusa egyedi legyen
- Építs feszültséget és érzelmi ívet
- CSAK a megadott karaktereket használd
- Tartsd meg a megadott POV szemszöget
- A jelenet hossza közelítsen a target_words értékhez
- Magyar nyelven írj, irodalmi stílusban`,

  erotikus: `Te egy sikeres erotikus regényíró vagy. Feladatod, hogy a megadott jelenet-vázlat alapján megírd a jelenet teljes szövegét.

ÍRÁSI SZABÁLYOK:
- Építsd az érzelmi és fizikai intimitást fokozatosan
- Használj érzéki, de nem vulgáris nyelvezetet
- A karakterek személyisége az intim jelenetekben is megmarad
- Az explicit tartalom a történet szerves része
- CSAK a megadott karaktereket használd
- Tartsd meg a megadott POV szemszöget
- A jelenet hossza közelítsen a target_words értékhez
- Magyar nyelven írj, irodalmi stílusban
- A beleegyezés és tisztelet fontos`,

  szakkonyv: `Te egy tapasztalt szakkönyv szerző vagy. Feladatod, hogy a megadott vázlat alapján megírd a szekció teljes szövegét.

ÍRÁSI SZABÁLYOK:
- Világos, logikus struktúra
- Magyarázd el a szakkifejezéseket
- Adj konkrét példákat
- Didaktikus, de olvasmányos stílus
- A szekció hossza közelítsen a target_words értékhez
- Magyar nyelven írj, szakmai stílusban`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      projectId, 
      chapterId,
      sceneNumber,
      sceneOutline,
      previousContent,
      characters,
      storyStructure,
      genre,
      chapterTitle
    } = await req.json();

    if (!projectId || !chapterId || !sceneOutline) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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

    const systemPrompt = SYSTEM_PROMPTS[genre] || SYSTEM_PROMPTS.fiction;

    let userPrompt = `ÍRD MEG AZ ALÁBBI JELENETET:

FEJEZET: ${chapterTitle}
JELENET #${sceneNumber}: "${sceneOutline.title}"

JELENET RÉSZLETEI:
- POV (nézőpont): ${sceneOutline.pov}
- Helyszín: ${sceneOutline.location}
- Időpont: ${sceneOutline.time}
- Mi történik: ${sceneOutline.description}
- Kulcsesemények: ${sceneOutline.key_events?.join(", ")}
- Érzelmi ív: ${sceneOutline.emotional_arc}
- Célhossz: ~${sceneOutline.target_words} szó
`;

    if (storyStructure) {
      userPrompt += `
TÖRTÉNET KONTEXTUS:
- Főszereplő: ${storyStructure.protagonist?.name} - ${storyStructure.protagonist?.description}
  Belső konfliktus: ${storyStructure.protagonist?.innerConflict || "N/A"}
  Karakterív: ${storyStructure.protagonist?.arc || "N/A"}
- Ellenfél/Partner: ${storyStructure.antagonist?.name} - ${storyStructure.antagonist?.description}
- Helyszín: ${storyStructure.setting}
`;
    }

    if (characters) {
      userPrompt += `
KARAKTEREK (KÖTELEZŐ HASZNÁLNI, NE TALÁLJ KI ÚJAKAT!):
${characters}
`;
    }

    if (previousContent) {
      userPrompt += `
AZ EDDIGI TARTALOM (folytatásként írd):
---
${previousContent}
---
`;
    }

    userPrompt += `
Most írd meg ezt a jelenetet! A válasz CSAK a jelenet szövege legyen, semmi más megjegyzés vagy formázás.`;

    // The preview model can be rate-limited aggressively.
    // Use a stable model + retry a few times on transient gateway limits.
    const gatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    const gatewayPayload = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: Math.min(sceneOutline.target_words * 2, 8000),
      stream: true,
    };

    const MAX_GATEWAY_RETRIES = 3;
    let response: Response | null = null;
    let lastErrorText = "";

    for (let attempt = 0; attempt <= MAX_GATEWAY_RETRIES; attempt++) {
      response = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gatewayPayload),
      });

      if (response.ok) break;

      // Best-effort read for debugging; body can only be read once.
      try {
        lastErrorText = await response.text();
      } catch {
        lastErrorText = "";
      }

      const isRetryable = response.status === 429 || response.status >= 500;
      if (!isRetryable || attempt === MAX_GATEWAY_RETRIES) break;

      const retryAfter = response.headers.get("retry-after");
      const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : NaN;
      const baseDelay = Number.isFinite(retryAfterMs) ? retryAfterMs : Math.min(2000 * 2 ** attempt, 15000);
      const jitter = Math.floor(Math.random() * 750);
      await sleep(baseDelay + jitter);
    }

    if (!response) {
      return new Response(
        JSON.stringify({ error: "AI szolgáltatás hiba" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Túl sok kérés. Kérlek várj." }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": "10",
            },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredit elfogyott." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", response.status, lastErrorText);
      return new Response(
        JSON.stringify({ error: "AI szolgáltatás hiba" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the stream to get full text for word counting
    const sceneContent = await parseSSEStream(response);
    const wordCount = countWords(sceneContent);
    
    // Update user_usage for billing with extra credit fallback
    if (wordCount > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get user_id from project
      const { data: project } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single();
      
      if (project?.user_id) {
        try {
          // Get current month usage and limits
          const currentMonth = new Date().toISOString().slice(0, 7);
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("monthly_word_limit, extra_words_balance")
            .eq("user_id", project.user_id)
            .single();
          
          const { data: usageData } = await supabase
            .from("user_usage")
            .select("words_generated")
            .eq("user_id", project.user_id)
            .eq("month", currentMonth)
            .single();
          
          const monthlyLimit = profile?.monthly_word_limit || 5000;
          const currentUsage = usageData?.words_generated || 0;
          const extraBalance = profile?.extra_words_balance || 0;
          const remainingMonthly = Math.max(0, monthlyLimit - currentUsage);
          
          if (monthlyLimit === -1) {
            // Unlimited plan - just track usage
            await supabase.rpc('increment_words_generated', {
              p_user_id: project.user_id,
              p_word_count: wordCount
            });
          } else if (wordCount <= remainingMonthly) {
            // Fits within monthly limit
            await supabase.rpc('increment_words_generated', {
              p_user_id: project.user_id,
              p_word_count: wordCount
            });
          } else {
            // Need to use extra credits
            const fromMonthly = remainingMonthly;
            const fromExtra = wordCount - remainingMonthly;
            
            if (fromExtra > extraBalance) {
              console.error(`Insufficient credits: need ${fromExtra} extra, have ${extraBalance}`);
              // Still track the usage but log warning
            }
            
            // Track what we used from monthly
            if (fromMonthly > 0) {
              await supabase.rpc('increment_words_generated', {
                p_user_id: project.user_id,
                p_word_count: fromMonthly
              });
            }
            
            // Use extra credits for the rest
            if (fromExtra > 0 && extraBalance > 0) {
              const toDeduct = Math.min(fromExtra, extraBalance);
              await supabase.rpc('use_extra_credits', {
                p_user_id: project.user_id,
                p_word_count: toDeduct
              });
              console.log(`Used ${toDeduct} extra credits for user ${project.user_id}`);
            }
          }
          
          console.log(`Word usage tracked: ${wordCount} words for user ${project.user_id}`);
        } catch (usageError) {
          console.error('Failed to update word usage:', usageError);
        }
      }
    }
    
    // Return the content as JSON (not streaming anymore, but complete)
    return new Response(
      JSON.stringify({ content: sceneContent, wordCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Write scene error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
