import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings } from "../_shared/ai-settings.ts";
import { detectRepetition } from "../_shared/repetition-detector.ts";
import { stripMarkdown } from "../_shared/quality-checker.ts";
import { detectPOVDrift, buildPOVFixInstruction } from "../_shared/pov-detector.ts";
import {
import { getModelForTask } from "../_shared/ai-settings.ts";
  countCliches,
  buildClicheLectorInstruction,
} from "../_shared/cliche-tracker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(w => /[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(w)).length;

const LECTOR_SYSTEM_PROMPT = `Te egy tapasztalt magyar irodalmi lektor vagy. A feladatod egy AI által generált szépirodalmi szöveg minőségének javítása. NEM újraírod a szöveget, hanem FINOMÍTOD: klisék cseréje, ismétlődések megszüntetése, és stílusproblémák javítása.

SZABÁLYOK:

1. TARTSD MEG a cselekmény minden elemét — NE változtasd meg, mi történik, csak azt, HOGYAN van leírva!

2. TARTSD MEG a párbeszédek tartalmát — a karakterek ugyanazt mondják, csak természetesebben.

3. TARTSD MEG a jelenet hosszát — NE rövidítsd és NE hosszabbítsd meg jelentősen (±10% elfogadható).

4. A javított szöveg CSAK a lektorált jelenet legyen, semmi más (nincs bevezető, nincs kommentár).

JAVÍTANDÓ PROBLÉMÁK:

A. TESTI REAKCIÓ KLISÉK — Ha a szövegben bármelyik az alábbi TÖBBSZÖR előfordul, cseréld le KÜLÖNBÖZŐ alternatívákra:

   - "gyomra összeszorult/görcsbe rándult/rándulással jelezte" → torka kiszáradt / háta közepén hideg futott végig / lába elgyengült / tenyere verejtékezni kezdett / ujjhegyei elzsibbadtak / vér a fülében dübörgött
   - "szíve a torkában dobogott/lüktetett" → pulzusa felszökött / halántéka lüktetett / mellkasa összeszorult
   - "ujjai elfehéredtek" → ujjai begörbültek / ujjai belemélyedtek / keze ökölbe szorult

B. PÁRBESZÉD TAG KLISÉK — Ha a "suttogta" 2x-nél többször fordul elő, a felesleges előfordulásokat cseréld:

   - akció-tagre ("– Elég volt. Anna a tenyerét az asztalra csapta.")
   - tag nélkülire ("– És mit vársz tőlem?")
   - leírás-tagre ("– Gyere ide. A hangja alig volt több suttogásnál.")

C. JELENETNYITÁS — Ha a jelenet "A laptop/monitor/képernyő kékes fénye..." formulával kezdődik, írd át más nyitásra (párbeszéd, cselekvés, érzékszervi leírás).

D. FILTER WORDS — Minden "Látta, hogy...", "Hallotta, ahogy...", "Érezte, hogy..." szerkezetet írd át közvetett leírásra:

   - "Látta, hogy az ajtó kinyílt." → "Az ajtó kinyílt."

E. ISMÉTLŐDŐ SZAVAK — Ha ugyanaz a leíró szó (lüktetett, visszhangzott, megremegett, megmerevedett) 2x-nél többször fordul elő a jelenetben, cseréld szinonimára.

F. MONDATKEZDÉS ISMÉTLÉS — Ha 3+ egymást követő mondat "A/Az + főnév" szerkezettel kezdődik, variáld meg.

G. MAGYAR NYELVI PONTOSSÁG — Javítsd a helyesírási és ragozási hibákat, ha vannak.

FORMÁZÁS:

- NE használj markdown jelölőket (**, ##, stb.)

- Írj tiszta prózát

- Magyar párbeszéd: gondolatjel (–), magyar idézőjel „..."

- NE add vissza a FEJEZET/JELENET/MŰFAJ/KONTEXTUS metaadatokat — CSAK a prózát!
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_MODEL = await getModelForTask("lector");
    const { projectId, chapterId, sceneNumber, originalContent, genre, chapterTitle } = await req.json();

    if (!projectId || !chapterId || !originalContent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: projectId, chapterId, originalContent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const originalWordCount = countWords(originalContent);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const aiSettings = await getAISettings(supabaseUrl, serviceRoleKey);
    const lectorTemperature = Math.max(aiSettings.temperature - 0.15, 0.4);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Look up project POV expectation + book-level cliché counts so far for targeted lector hints
    let expectedPov: string | null = null;
    const bookClicheCounts: Record<string, number> = {};
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const [{ data: proj }, { data: chapters }] = await Promise.all([
        supabase.from("projects").select("fiction_style").eq("id", projectId).single(),
        supabase.from("chapters").select("cliche_counts, id").eq("project_id", projectId),
      ]);
      const fs = (proj?.fiction_style as Record<string, unknown> | null) || null;
      expectedPov = (fs?.pov as string | undefined) || null;
      for (const ch of (chapters as Array<{ id: string; cliche_counts: Record<string, number> }> | null) || []) {
        // Exclude the current chapter so we don't double count this scene
        if (ch.id === chapterId) continue;
        for (const [k, v] of Object.entries(ch.cliche_counts || {})) {
          bookClicheCounts[k] = (bookClicheCounts[k] || 0) + (Number(v) || 0);
        }
      }
    } catch (e) {
      console.warn("[auto-lector] Could not load project pov / cliché history:", e);
    }

    const sceneClicheCounts = countCliches(originalContent);
    const clicheLectorBlock = buildClicheLectorInstruction(sceneClicheCounts, bookClicheCounts);

    const povDrift = detectPOVDrift(originalContent, expectedPov);
    const povFixBlock = buildPOVFixInstruction(expectedPov, povDrift);
    if (povDrift.hasDrift) {
      console.log(
        `[auto-lector] POV drift detected for scene ${sceneNumber}: e1=${povDrift.e1Count}, e3=${povDrift.e3Count}, expected=${expectedPov}`
      );
    }

    const userPrompt = `Lektoráld az alábbi jelenetet. Javítsd a klisék ismétlődését, a szókincs monotóniáját és a stílusproblémákat, de TARTSD MEG a cselekményt, a párbeszédek tartalmát és a jelenet hosszát.

FEJEZET: "${chapterTitle || "Ismeretlen"}"

JELENET: #${sceneNumber || 1}

MŰFAJ: ${genre || 'fiction'}
${povFixBlock}${clicheLectorBlock}

--- A JAVÍTANDÓ SZÖVEG ---

${originalContent}

--- SZÖVEG VÉGE ---

Add vissza a TELJES JAVÍTOTT jelenetet, semmi mást.`;

    const maxTokens = Math.min(Math.max(Math.round(originalWordCount * 2.5), 2048), 8192);

    let lectoredContent: string | null = null;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= 7; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [
              { role: "system", content: LECTOR_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: lectorTemperature,
            frequency_penalty: aiSettings.frequency_penalty,
            presence_penalty: aiSettings.presence_penalty,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status === 429 || response.status === 402) {
          console.warn(`[auto-lector] Rate limit/payment error (${response.status}), attempt ${attempt}`);
          if (attempt < 7) {
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
            continue;
          }
          lastError = `AI gateway returned ${response.status}`;
          break;
        }

        if (response.status === 502 || response.status === 503) {
          console.warn(`[auto-lector] Gateway error (${response.status}), attempt ${attempt}`);
          if (attempt < 7) {
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
            continue;
          }
          lastError = `AI gateway returned ${response.status}`;
          break;
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[auto-lector] AI error: ${response.status} ${errText}`);
          lastError = `AI error: ${response.status}`;
          if (attempt < 7) {
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
            continue;
          }
          break;
        }

        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content;
        if (raw && typeof raw === "string" && raw.trim().length > 50) {
          lectoredContent = raw.trim();
          break;
        }

        console.warn(`[auto-lector] Empty or too short response, attempt ${attempt}`);
        lastError = "Empty response from AI";
        if (attempt < 7) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      } catch (e) {
        if (e.name === "AbortError") {
          console.warn(`[auto-lector] Timeout on attempt ${attempt}`);
          lastError = "Request timeout";
        } else {
          console.error(`[auto-lector] Error on attempt ${attempt}:`, e);
          lastError = e.message || "Unknown error";
        }
        if (attempt < 7) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
    }

    if (!lectoredContent) {
      console.warn(`[auto-lector] All attempts failed: ${lastError}`);
      return new Response(
        JSON.stringify({
          content: originalContent,
          wordCount: originalWordCount,
          wasModified: false,
          error: lastError,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    lectoredContent = stripMarkdown(lectoredContent);

    const repResult = detectRepetition(lectoredContent);
    if (repResult.isRepetitive && repResult.score > 0.3) {
      lectoredContent = repResult.cleanedText;
    }

    const lectoredWordCount = countWords(lectoredContent);

    if (lectoredWordCount < originalWordCount * 0.5 || lectoredWordCount > originalWordCount * 1.5) {
      console.warn(
        `[auto-lector] Length mismatch: original=${originalWordCount}, lectored=${lectoredWordCount}. Keeping original.`
      );
      return new Response(
        JSON.stringify({
          content: originalContent,
          wordCount: originalWordCount,
          wasModified: false,
          error: "Lector output length out of bounds",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[auto-lector] Success: ${originalWordCount} → ${lectoredWordCount} words (${((lectoredWordCount / originalWordCount) * 100).toFixed(0)}%)`
    );

    return new Response(
      JSON.stringify({
        content: lectoredContent,
        wordCount: lectoredWordCount,
        wasModified: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[auto-lector] Fatal error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
