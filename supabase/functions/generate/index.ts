import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { 
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" 
};

const NO_MARKDOWN_RULE = `

FORMÁZÁSI SZABÁLY (KÖTELEZŐ):
- NE használj markdown jelölőket (**, ##, ***, ---, \`\`\`, stb.)
- Címsorokhoz írj normál nagybetűs szöveget új sorban
- Kiemeléshez egyszerűen hangsúlyos szavakat használj, jelölés nélkül
- Listákhoz használj gondolatjelet (–) és új sort
- Az olvasó tiszta, folyamatos prózát kapjon
`;

const HUNGARIAN_GRAMMAR_RULES = `

## MAGYAR NYELVI SZABÁLYOK (KÖTELEZŐ):

NÉVSORREND: Magyar névsorrend: Vezetéknév + Keresztnév (pl. "Kovács János", NEM "János Kovács").

PÁRBESZÉD FORMÁZÁS:
- Magyar párbeszédjelölés: gondolatjel (–) a sor elején
- Idézőjel használata: „..." (magyar idézőjel, NEM "...")
- Példa helyes formátum:
  – Hová mész? – kérdezte Anna.
  – A boltba – válaszolta.

ÍRÁSJELEK:
- Gondolatjel: – (hosszú, NEM -)
- Három pont: ... (NEM …)
- Vessző MINDIG a kötőszavak előtt: "de, hogy, mert, ha, amikor, amely, ami"

KERÜLENDŐ HIBÁK:
- NE használj angolszász névsorrendet
- NE használj tükörfordításokat ("ez csinál értelmet" → "ennek van értelme")
- NE használj angol idézőjeleket ("..." → „...")
- NE használj felesleges névelőket angolosan

NYELVTANI HELYESSÉG:
- Ragozás: ügyelj a magyar ragozás helyességére
- Szórend: magyar szórend, NEM angol (ige-alany-tárgy)
- Összetett szavak: egybe vagy külön az MTA szabályai szerint
`;

const SYSTEM_PROMPTS: Record<string, string> = {
  szakkonyv: `Te egy szakkönyv író asszisztens vagy. Strukturált, didaktikus stílusban írj. Magyar nyelven válaszolj.${NO_MARKDOWN_RULE}${HUNGARIAN_GRAMMAR_RULES}`,
  fiction: `Te egy kreatív író asszisztens vagy. Narratív, leíró stílusban írj. Magyar nyelven válaszolj.${NO_MARKDOWN_RULE}${HUNGARIAN_GRAMMAR_RULES}`,
  erotikus: `Te egy felnőtt tartalom író asszisztens vagy. Érzéki, intim stílusban írj. Magyar nyelven válaszolj.${NO_MARKDOWN_RULE}${HUNGARIAN_GRAMMAR_RULES}`,
};

const ACTION_PROMPTS: Record<string, string> = {
  continue: "Folytasd a szöveget természetesen, megtartva a stílust és a hangulatot.",
  rewrite: "Írd át a megadott szöveget. CSAK az átírt szöveget add vissza, semmi mást. Ne adj hozzá bevezetést, magyarázatot vagy folytatást. A kimenet hossza NE haladja meg az eredeti szöveg hosszát.",
  shorten: "Tömörítsd a megadott szöveget. CSAK a tömörített szöveget add vissza, semmi mást. A kimenet legyen rövidebb mint az eredeti.",
  expand: "Bővítsd ki a megadott szöveget részletesebb leírásokkal. CSAK a bővített szöveget add vissza. Maximum kétszeres hosszúság.",
  dialogue: "Írj természetes párbeszédet a karakterek között.",
  description: "Írj részletes, érzékletes leírást.",
  chat: "Válaszolj a kérdésre segítőkészen.",
  write_chapter: "Írd meg a fejezetet teljes terjedelmében, jól strukturáltan.",
};

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

// Dynamic token limit based on action type and input length
const getMaxTokens = (action: string, prompt: string, settings: Record<string, unknown> | null): number => {
  // Selection-based actions - output scales with input
  if (action === "rewrite" || action === "shorten") {
    const selectedTextMatch = prompt.match(/"([^"]+)"$/s);
    if (selectedTextMatch) {
      const selectedWords = selectedTextMatch[1].split(/\s+/).length;
      const multiplier = action === "shorten" ? 1 : 1.5;
      return Math.min(500, Math.max(50, Math.ceil(selectedWords * 1.5 * multiplier)));
    }
    return 200;
  }
  
  if (action === "expand") {
    const selectedTextMatch = prompt.match(/"([^"]+)"$/s);
    if (selectedTextMatch) {
      const selectedWords = selectedTextMatch[1].split(/\s+/).length;
      return Math.min(1500, Math.max(150, Math.ceil(selectedWords * 4)));
    }
    return 600;
  }
  
  // Long operations (chapter, continue, dialogue, description)
  if (action === "write_chapter") {
    return settings?.length === "long" ? 8000 : settings?.length === "medium" ? 4000 : 2000;
  }
  
  // Chat, continue, dialogue, description - based on user settings
  return settings?.length === "long" ? 8000 : settings?.length === "medium" ? 4000 : 1500;
};

const buildStylePrompt = (styleProfile: Record<string, unknown> | null): string => {
  if (!styleProfile?.style_summary) return "";
  const parts = ["\n--- STÍLUS ---", `Összefoglaló: ${styleProfile.style_summary}`];
  if (styleProfile.avg_sentence_length) parts.push(`Mondathossz: ${styleProfile.avg_sentence_length} szó`);
  if (styleProfile.dialogue_ratio) parts.push(`Párbeszéd: ${Math.round(Number(styleProfile.dialogue_ratio) * 100)}%`);
  parts.push("Utánozd ezt a stílust!");
  return parts.join("\n");
};

// Fetch AI model from system_settings
async function getAIModel(supabaseUrl: string, serviceRoleKey: string): Promise<string> {
  try {
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await serviceClient
      .from("system_settings")
      .select("value")
      .eq("key", "ai_default_model")
      .single();

    if (error || !data) {
      console.log("No AI model configured, using default:", DEFAULT_MODEL);
      return DEFAULT_MODEL;
    }

    // Value is stored as JSON string
    const value = data.value as unknown;
    const model = typeof value === "string" ? JSON.parse(value) : value;
    console.log("Using AI model from settings:", model);
    return (model as string) || DEFAULT_MODEL;
  } catch (err) {
    console.error("Error fetching AI model:", err);
    return DEFAULT_MODEL;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // SECURITY: Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Hitelesítés szükséges" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen vagy lejárt token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    const { action, prompt, context, genre, settings, projectId, chapterId } = await req.json();
    if (!prompt) return new Response(JSON.stringify({ error: "Prompt szükséges" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get AI model from system settings (using service role for reading)
    const model = await getAIModel(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let stylePrompt = "";
    if (settings?.useProjectStyle) {
      const { data: styleProfile } = await serviceClient.from("user_style_profiles").select("*").eq("user_id", userId).single();
      if (styleProfile) stylePrompt = buildStylePrompt(styleProfile);
    }

    const systemPrompt = `${SYSTEM_PROMPTS[genre] || SYSTEM_PROMPTS.fiction}\n\n${ACTION_PROMPTS[action] || ACTION_PROMPTS.chat}${context?.bookDescription ? `\n\nKönyv: ${context.bookDescription}` : ""}${context?.previousChapters ? `\n\n--- ELŐZŐ FEJEZETEK ---\n${context.previousChapters}` : ""}${context?.currentChapterTitle ? `\n\nAKTUÁLIS FEJEZET: ${context.currentChapterTitle}` : ""}${stylePrompt}`;
    const maxTokens = getMaxTokens(action, prompt, settings);

    const messages: Array<{role: string; content: string}> = [
      { role: "system", content: systemPrompt }
    ];
    
    if (context?.chapterContent) { 
      messages.push({ role: "user", content: `Kontextus:\n${context.chapterContent}` }); 
      messages.push({ role: "assistant", content: "Megértettem." }); 
    }
    messages.push({ role: "user", content: prompt });

    // Retry logic with exponential backoff (429/502/503 handling)
    const maxRetries = 7;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ 
            model,
            max_tokens: maxTokens,
            stream: true,
            messages
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429 || response.status === 402 || response.status === 502 || response.status === 503 || response.status === 529) {
          console.error(`Status ${response.status} (attempt ${attempt}/${maxRetries})`);
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "Nincs elég kredit, kérlek töltsd fel a Lovable AI egyenlegedet" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          if (attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
        break;
      } catch (fetchError) {
        console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          if (attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return new Response(JSON.stringify({ error: "Időtúllépés" }), { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw fetchError;
      }
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : "No response";
      console.error("AI Gateway error:", response?.status, errorText);
      return new Response(JSON.stringify({ error: "AI hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Stream response directly - Lovable AI Gateway uses OpenAI-compatible format
    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    console.error("Generate error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
