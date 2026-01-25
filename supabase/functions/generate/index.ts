import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const NO_MARKDOWN_RULE = `

FORMÁZÁSI SZABÁLY (KÖTELEZŐ):
- NE használj markdown jelölőket (**, ##, ***, ---, \`\`\`, stb.)
- Címsorokhoz írj normál nagybetűs szöveget új sorban
- Kiemeléshez egyszerűen hangsúlyos szavakat használj, jelölés nélkül
- Listákhoz használj gondolatjelet (–) és új sort
- Az olvasó tiszta, folyamatos prózát kapjon
`;

const SYSTEM_PROMPTS: Record<string, string> = {
  szakkonyv: `Te egy szakkönyv író asszisztens vagy. Strukturált, didaktikus stílusban írj. Magyar nyelven válaszolj.${NO_MARKDOWN_RULE}`,
  fiction: `Te egy kreatív író asszisztens vagy. Narratív, leíró stílusban írj. Magyar nyelven válaszolj.${NO_MARKDOWN_RULE}`,
  erotikus: `Te egy felnőtt tartalom író asszisztens vagy. Érzéki, intim stílusban írj. Magyar nyelven válaszolj.${NO_MARKDOWN_RULE}`,
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

// Dinamikus token limit kiszámítása a művelet típusa és bemenet hossza alapján
const getMaxTokens = (action: string, prompt: string, settings: Record<string, unknown> | null): number => {
  // Kijelölt szöveg alapú műveletek - a kimenet a bemenethez igazodik
  if (action === "rewrite" || action === "shorten") {
    const selectedTextMatch = prompt.match(/"([^"]+)"$/s);
    if (selectedTextMatch) {
      const selectedWords = selectedTextMatch[1].split(/\s+/).length;
      // Rewrite: kb. ugyanannyi szó, shorten: kb. fele
      const multiplier = action === "shorten" ? 1 : 1.5;
      // Token = szó * 1.5 (magyar nyelv), minimum 50, maximum 500
      return Math.min(500, Math.max(50, Math.ceil(selectedWords * 1.5 * multiplier)));
    }
    return 200; // Alapértelmezett rövid műveleteknél
  }
  
  if (action === "expand") {
    const selectedTextMatch = prompt.match(/"([^"]+)"$/s);
    if (selectedTextMatch) {
      const selectedWords = selectedTextMatch[1].split(/\s+/).length;
      // Bővítés: kb. 2-3x az eredeti
      return Math.min(1500, Math.max(150, Math.ceil(selectedWords * 4)));
    }
    return 600;
  }
  
  // Hosszú műveletek (fejezet, folytatás, párbeszéd, leírás)
  if (action === "write_chapter") {
    return settings?.length === "long" ? 8000 : settings?.length === "medium" ? 4000 : 2000;
  }
  
  // Chat, continue, dialogue, description - felhasználói beállítás szerint
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, prompt, context, genre, settings, projectId, chapterId } = await req.json();
    if (!prompt) return new Response(JSON.stringify({ error: "Prompt szükséges" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let stylePrompt = "";
    const authHeader = req.headers.get("Authorization");
    if (settings?.useProjectStyle && authHeader) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) {
        const { data: styleProfile } = await supabase.from("user_style_profiles").select("*").eq("user_id", user.id).single();
        if (styleProfile) stylePrompt = buildStylePrompt(styleProfile);
      }
    }

    const systemPrompt = `${SYSTEM_PROMPTS[genre] || SYSTEM_PROMPTS.fiction}\n\n${ACTION_PROMPTS[action] || ACTION_PROMPTS.chat}${context?.bookDescription ? `\n\nKönyv: ${context.bookDescription}` : ""}${stylePrompt}`;
    const maxTokens = getMaxTokens(action, prompt, settings);

    const messages = [];
    if (context?.chapterContent) { messages.push({ role: "user", content: `Kontextus:\n${context.chapterContent}` }); messages.push({ role: "assistant", content: "Megértettem." }); }
    messages.push({ role: "user", content: prompt });

    // Retry logic exponenciális backoff-al (429/502/503 kezelés)
    const maxRetries = 7;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, ...messages], max_tokens: maxTokens, stream: true }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429 || response.status === 502 || response.status === 503) {
          console.error(`Status ${response.status} (attempt ${attempt}/${maxRetries})`);
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
      return new Response(JSON.stringify({ error: "AI hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
