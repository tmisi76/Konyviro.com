import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadSeriesContext, buildSeriesContextPrompt } from "../_shared/series-context.ts";
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
  buildBodyLanguageVarietyRules,
  buildSceneOpeningRules,
  buildAntiRepetitionPrompt,
  buildCharacterIdentityLock,
  buildCharacterStatusLock,
  buildRecurringNamesLock,
  extractCandidateCharacterNames,
} from "../_shared/prompt-builder.ts";
import { checkSceneQuality, stripMarkdown, buildQualityRetryPrompt } from "../_shared/quality-checker.ts";
import {
  countCliches,
  mergeClicheCounts,
  buildClicheBlocklistPrompt,
  detectClicheOverflow,
} from "../_shared/cliche-tracker.ts";
import { validateAndFixCharacterNames, stripChapterTitleDupes } from "../_shared/name-consistency.ts";
import { findInvalidHonorificNames } from "../_shared/name-validator.ts";
import {
  extractBigrams,
  mergeBigrams,
  loadBigrams,
  persistBigrams,
  buildBigramAvoidanceInstruction,
  BIGRAM_RETRY_THRESHOLD,
} from "../_shared/bigram-cliche-tracker.ts";
import { getModelForTask } from "../_shared/ai-settings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Word-compatible counting: only tokens containing at least one letter
const countWords = (t: string) => t.trim().split(/\s+/).filter(w => /[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(w)).length;

const FICTION_SYSTEM_PROMPT = `Te egy díjnyertes regényíró vagy, a magyar széppróza mestere. A feladatod egyetlen lenyűgöző jelenetet megírni.

MIELŐTT ÍRNÁL: Gondold végig magadban (NE írd le!) a jelenet ívét: mi a nyitó helyzet, hol a fordulópont, és hogyan zárul a jelenet úgy, hogy az olvasó tovább akarjon olvasni.

## 1. SHOW, DON'T TELL — MUTASS, NE MONDJ

Ez a legfontosabb szabály. Soha ne MONDD meg mit érez a karakter — MUTASD meg cselekvésen, testbeszéden és gondolatokon keresztül.

ROSSZ → JÓ példák:

ROSSZ: "Anna szomorú volt."

JÓ: "Anna a szeme sarkát törölgette. A tekintete a padlóra siklott, a vállai megereszkedtek, és egy remegő sóhaj szakadt ki belőle."

ROSSZ: "Péter nagyon dühös lett."

JÓ: "Péter ujjai elfehéredtek az asztallap szélén. Az állkapcsa megfeszült, és az orrlyukai kitágultak, mielőtt a szék hátratolt volna a padlón."

ROSSZ: "A szoba kényelmes volt és jó illata volt."

JÓ: "A kandalló melegétől a bőrfotelek barna felülete enyhén csillogott. Fahéj és narancs illata keveredett a levegőben."

ROSSZ: "Félelem töltötte el."

JÓ: "A tarkóján hideg futott végig. A lélegzete fennakadt, és az ujjhegyei elzsibbadtak."

## 2. FILTER WORD TILALOM (ABSZOLÚT — 0 TOLERANCIA!)

AZ ALÁBBI SZERKEZETEK SOHA, SEMMILYEN KÖRÜLMÉNYEK KÖZÖTT NEM FORDULHATNAK ELŐ A SZÖVEGBEN:

- "Látta, hogy…"

- "Hallotta, ahogy…"

- "Érezte, hogy…"

- "Észrevette, hogy…"

- "Megfigyelte, hogy…"

- "Rájött, hogy…"

- "Tudta, hogy…"

Ezek KIZÖKKENTIK az olvasót a POV-ból. Ha a POV karakter szemén keresztül látjuk a világot, nem kell jelezni hogy "látta".

ROSSZ: "Látta, hogy az ajtó kinyílt." → JÓ: "Az ajtó kinyílt."

ROSSZ: "Hallotta, ahogy a padló nyikorog." → JÓ: "A padló megnyikordult a lába alatt."

ROSSZ: "Érezte, hogy a szíve gyorsabban ver." → JÓ: "A pulzusa felszökött."

ROSSZ: "Észrevette, hogy a lány elpirult." → JÓ: "A lány arcát pír öntötte el."

## 3. MÉLY POV (DEEP POINT OF VIEW)

A narráció teljes egészében a POV karakter fejéből szól. A világ leírása az ő szubjektív észlelése.

- Ha dühös → a mondatok rövidek, szaggatottak, a fókusz a zavaró részleteken

- Ha szomorú → a mondatok hosszabbak, lassabbak, a fókusz a hiányon

- Ha izgatott → a mondatok gyorsulnak, a fókusz előre szalad

A POV karakter gondolatait NE jelöld külön ("gondolta") — egyszerűen írd bele a narrációba:

ROSSZ: "Ez nem lehet igaz — gondolta Anna." → JÓ: "Ez nem lehet igaz. Anna hátrált egy lépést."

## 4. ÉRZÉKSZERVI RÉSZLETEK

Minden jelenetben LEGALÁBB 3 érzékszervet használj: látás, hallás, szaglás, tapintás, ízlelés.

Az érzékszervi részletek SZOLGÁLJÁK a hangulatot.

## 5. JELENETSTRUKTÚRA

Minden jelenetnek legyen belső íve:

1. NYITÁS: A POV karakter céllal lép be (mit akar elérni?)

2. AKADÁLY: Valami keresztbe tesz (belső vagy külső konfliktus)

3. FORDULAT: A helyzet megváltozik

4. ZÁRÁS: Hook — az olvasó tovább akarjon olvasni

A jelenet NE legyen "és aztán… és aztán… és aztán…" lineáris felsorolás!

## 6. PÁRBESZÉD SZABÁLYOK (KRITIKUS!)

PÁRBESZÉD TAG KORLÁTOZÁSOK:

- "suttogta" MAXIMUM 1x fordulhat elő egy jelenetben! Ez a szó KÜLÖNLEGES pillanatokra van fenntartva.

- "mondta" MAXIMUM 3x jelenetenként.

- "kérdezte" MAXIMUM 2x jelenetenként.

PÁRBESZÉD TAG TECHNIKÁK (kötelező váltogatni!):

1. AKCIÓ-TAG (a LEGJOBB!): "– Elég volt. Anna a tenyerét az asztalra csapta."

2. TAG NÉLKÜL (ha egyértelmű ki beszél): "– És mit vársz tőlem?"

3. GONDOLAT-TAG: "– Persze. Mintha bárkit is érdekelt volna az igazság."

4. LEÍRÁS-TAG: "– Gyere ide. A hangja alig volt több suttogásnál."

5. CSELEKVÉS KÖZBENI: "– Nem érdekel. Felkapta a kabátját és az ajtó felé indult."

ARÁNY: A párbeszéd sorok LEGALÁBB 40%-a legyen TAG NÉLKÜLI.

ROSSZ PÉLDA (monoton tagek):

"– Elmegyek – mondta Anna.

– Rendben – mondta Péter.

– Mikor jössz? – kérdezte Anna.

– Holnap – mondta Péter."

JÓ PÉLDA (variált technikák):

"– Elmegyek. Anna felkapta a kabátját az ajtókilincsről.

Péter bólintott, de a szeme sarkából a bőröndöt figyelte.

– Mikor jössz?

– Holnap – hazudta."

## 7. TESTI REAKCIÓK VARIÁCIÓJA (KRITIKUS!)

AZ ALÁBBI KIFEJEZÉSEK TILTOTTAK (túlhasználat miatt):

- "gyomra összeszorult / görcsbe rándult / egyetlen rándulással jelezte" — MAXIMUM 1x az EGÉSZ könyvben!

- "szíve a torkában dobogott / lüktetett" — MAXIMUM 1x az EGÉSZ könyvben!

- "ujjai elfehéredtek" — MAXIMUM 1x az EGÉSZ könyvben!

- "tarkóján felállt a szőr" — MAXIMUM 1x az EGÉSZ könyvben!

EHELYETT — VÁLTOGASD az alábbi reakciókat:

FÉLELEM: a torka kiszáradt / a háta közepén hideg futott végig / a lába elgyengült / a levegő bennrekedt a tüdejében / a nyaka izmai megfeszültek / a tenyere verejtékezni kezdett / az ujjhegyei elzsibbadtak / a vér a fülében dübörgött / a bőre libabőrös lett / a térdei megrogytak

MEGLEPETÉS: a szava elakadt / a tekintete megállt / megdermedt félmozdulatban / a lélegzete fennakadt / a keze a levegőben maradt / egy pillanatra elsötétült előtte a világ

DÜH: a halántéka lüktetett / a fogait összeszorította / az ökle összeszorult / a vér a fejébe szökött / az állkapcsa megfeszült / az arca égett / a mellkasa összeszorult

## 8. JELENETNYITÁS VARIÁCIÓ (KRITIKUS!)

TILTOTT JELENETNYITÁSOK:

- "A laptop/monitor/képernyő kékes fénye megvilágította XY arcát" — SOHA TÖBBÉ! Ez a nyitás TILTOTT!

- "A kékes fény" kifejezés TILTOTT az egész szövegben!

JELENETNYITÁS TECHNIKÁK (kötelező váltogatni!):

1. PÁRBESZÉDDEL (in medias res): "– Ezt nem gondolhatod komolyan."

2. FIZIKAI CSELEKVÉSSEL: "Anna a kulcsot a zárba fordította, de a keze megállt félúton."

3. KÖRNYEZETI ÉRZÉKKEL: "A folyosóról kávéillat és halk nevetés szűrődött be."

4. BELSŐ GONDOLATTAL: "Valami nem stimmelt. Az érzés a tarkójában bujkált, mint egy szálka."

5. ATMOSZFÉRÁVAL: "A hajnali köd úgy ült a városra, mintha gyapjútakaróval borították volna be."

Soha ne nyiss egymás után két jelenetet ugyanazzal a technikával!

## 9. SZÓKINCS ÉS ISMÉTLÉS SZABÁLYOK

TILTOTT TÚLHASZNÁLATOK:

- "lüktetett" — MAXIMUM 2x fejezetenként

- "visszhangzott" — MAXIMUM 2x fejezetenként

- "megremegett" — MAXIMUM 2x fejezetenként

- "hangja rekedt volt" — MAXIMUM 1x fejezetenként

- "Ez nem lehet igaz" — MAXIMUM 1x az egész könyvben

- "megmerevedett" — MAXIMUM 1x fejezetenként

HASONLAT SZABÁLY:

- "mint egy" / "mint a" hasonlat MAXIMUM 3x fejezetenként!

- Használj METAFORÁT hasonlat HELYETT:

  ROSSZ (hasonlat): "A hangja éles volt, mint a borotva."

  JÓ (metafora): "A hangja borotvaélesen hasított."

MONDATKEZDÉS VARIÁCIÓ:

- TILOS 3 egymást követő mondatot "A/Az + főnév" szerkezettel kezdeni!

- TILOS 3x egymás után ugyanazzal a szóval kezdeni mondatot!

- TILOS: "A férfi… A férfi… A férfi…"

- Használj változatos nyitásokat: igével, határozóval, rövid tőmondattal

"VOLT" TÚLHASZNÁLAT TILALOM:

- Kerüld a "volt" igét ahol lehet — aktív igéket használj.

- ROSSZ: "Az asztal nagy volt. A szék kicsi volt. A szoba sötét volt."

- JÓ: "A masszív asztal szinte betöltötte a szobát. Mellette egy kopott kisszék lapult a félhomályban."

## 10. ÉRZELMI PALETTA BŐVÍTÉS

Az érzelmek NE legyenek csak félelem-düh-elszántság!

Használj VÁLTOZATOS érzelmeket a könyv során: megbánás, vágy, humor, irónia, nosztalgia, szomorúság, megkönnyebbülés, zavarodottság, szégyen, kíváncsiság, beletörődés, remény.

Minden 3-4 feszült jelenet után legyen 1 NYUGODTABB, EMBERIBB pillanat: csendes beszélgetés, emlék, humor, kis öröm. A feszültséget nem lehet folyamatosan 100-on tartani — hullámvölgy nélkül nincs csúcspont.

## FORMÁZÁS (KÖTELEZŐ):

- NE használj markdown jelölőket (**, ##, ***, stb.)

- Írj tiszta, folyamatos prózát

- A válasz CSAK a jelenet szövege legyen

- NE írj bevezető vagy záró kommentárt

- Magyar párbeszéd-jelölés: gondolatjel (–), magyar idézőjel „..."

- Névsorrend: Vezetéknév + Keresztnév

- Vessző kötőszavak előtt: de, hogy, mert, ha, amikor, amely, ami

`;

// Base prompts
const PROMPTS: Record<string, string> = {
  fiction: FICTION_SYSTEM_PROMPT,
  erotikus: "Te egy tehetséges erotikus regényíró vagy. Írj érzéki, szenvedélyes magyar prózát.",
  szakkonyv: "Te egy szakkönyv szerző vagy. Írj világos, strukturált magyar szöveget.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_MODEL = await getModelForTask("scene");
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
      .select("user_id, fiction_style, subcategory, recurring_names")
      .eq("id", projectId)
      .single();

    // Fetch characters for name lock (parallel with style profile)
    const [styleProfileResult, charactersResult, chapterRowResult, projectChaptersResult] = await Promise.all([
      project?.user_id
        ? supabase.from("user_style_profiles").select("*").eq("user_id", project.user_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("characters").select("name, role, occupation, backstory, appearance_description, status, death_chapter").eq("project_id", projectId),
      supabase.from("chapters").select("cliche_counts, title").eq("id", chapterId).single(),
      supabase.from("chapters").select("cliche_counts").eq("project_id", projectId),
    ]);

    // Aggregate cliché counts across the whole book so far
    const bookClicheCounts: Record<string, number> = {};
    for (const row of (projectChaptersResult?.data as Array<{ cliche_counts: Record<string, number> }> | null) || []) {
      const cc = row?.cliche_counts || {};
      for (const [k, v] of Object.entries(cc)) {
        bookClicheCounts[k] = (bookClicheCounts[k] || 0) + (Number(v) || 0);
      }
    }
    const clicheBlocklist = buildClicheBlocklistPrompt(bookClicheCounts);
    const dbChapterTitle = (chapterRowResult?.data as { title?: string } | null)?.title || chapterTitle;

    // Recurring names (mid-book minor characters NOT in characters table)
    const recurringNamesMap = (project?.recurring_names as Record<string, { role?: string; first_chapter?: number }> | null) || {};
    const recurringNamesLock = buildRecurringNamesLock(recurringNamesMap);

    // Identity lock — explicit "who is what" cards to prevent character-type drift
    const identityLock = buildCharacterIdentityLock(charactersResult?.data || null);
    // Status lock — prevent dead characters from reappearing as alive, lock professions
    const statusLock = buildCharacterStatusLock(charactersResult?.data || null);

    // Load project-wide bigram cliché counts and build avoidance instruction
    const bookBigrams = await loadBigrams(projectId);
    const bigramAvoidance = buildBigramAvoidanceInstruction(bookBigrams);

    if (styleProfileResult?.data?.style_summary) {
      stylePrompt = buildStylePrompt(styleProfileResult.data);
    }

    // Add fiction style if available
    const projectSubcategory = subcategory || project?.subcategory;
    if (project?.fiction_style) {
      fictionStylePrompt = buildFictionStylePrompt(project.fiction_style, projectSubcategory);
    }

    const basePrompt = PROMPTS[genre] || PROMPTS.fiction;
    // Series context (if this project belongs to a series, inject canonical world / characters / events)
    let seriesPrompt = "";
    try {
      const seriesCtx = await loadSeriesContext(supabase, projectId);
      seriesPrompt = buildSeriesContextPrompt(seriesCtx);
    } catch (e) {
      console.error("Failed to load series context", e);
    }
    const systemPrompt = basePrompt + fictionStylePrompt + stylePrompt + seriesPrompt;

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

    // Anti-summary, dialogue variety, body language, scene opening, anti-repetition rules
    const antiSummary = buildAntiSummaryRules();
    const dialogueVariety = buildDialogueVarietyRules();
    const bodyLanguageVariety = buildBodyLanguageVarietyRules();
    const sceneOpeningRules = buildSceneOpeningRules();
    const antiRepetition = buildAntiRepetitionPrompt((previousContent || '').slice(-2000));

    // Chapter-title duplication ban — the AI sometimes echoes the chapter title as an internal heading
    const titleDupeBan = dbChapterTitle
      ? `\n\n## FEJEZETCÍM TILALOM:\n- A fejezet címe ("${dbChapterTitle}") TILTOTT belső szakasz-fejlécként vagy önálló sorként a próza belsejében.\n- NE írd újra a fejezetcímet a jeleneten belül, NE használd alcímként, NE ismételd meg sehol a szövegben.`
      : "";

    const prompt = `KONTEXTUS:
- KÖNYV MŰFAJA: ${genre || 'fiction'}
- FEJEZET CÍME: "${chapterTitle}"
- JELENET SORSZÁMA: ${sceneNumber}

JELENET FELADAT:
- JELENET CÍME: "${sceneOutline.title}"
- POV KARAKTER: ${sceneOutline.pov || 'Nincs megadva'}
- HELYSZÍN: ${sceneOutline.location || 'Nincs megadva'}
- IDŐ: ${sceneOutline.time || 'Nincs megadva'}
- MI TÖRTÉNIK: ${sceneOutline.description}
- KULCSESEMÉNYEK (kötelezően meg kell történniük): ${(sceneOutline.key_events || []).join(', ')}
- ÉRZELMI ÍV: ${sceneOutline.emotional_arc || 'Nincs megadva'}
- POV KARAKTER CÉLJA: ${sceneOutline.pov_goal || 'Nincs megadva'}
- ÉRZELEM ELEJÉN: ${sceneOutline.pov_emotion_start || 'Semleges'}
- ÉRZELEM VÉGÉN: ${sceneOutline.pov_emotion_end || 'Változatlan'}
${characters ? `\nKARAKTEREK A JELENETBEN:\n${characters}` : ''}
${nameLock}${identityLock}${statusLock}${recurringNamesLock}${povEnforcement}
${characterHistoryContext}
${storyStructure ? `\nTÖRTÉNET KONTEXTUS:\n${typeof storyStructure === 'string' ? storyStructure : JSON.stringify(storyStructure)}` : ''}
${scenePositionCtx}${antiSummary}${dialogueVariety}${bodyLanguageVariety}${sceneOpeningRules}${antiRepetition}
${clicheBlocklist}${bigramAvoidance ? "\n\n" + bigramAvoidance : ""}${titleDupeBan}
${previousContent ? `\nELŐZŐ SZÖVEG (a folytonosság érdekében, NE ismételd!):\n${previousContent.slice(-3000)}` : ''}

HOSSZ: ~${effectiveTargetWords} szó. Ne lépd túl jelentősen!

CSAK a jelenet szövegét add vissza, mindenféle bevezető vagy záró kommentár nélkül. NE ismételd vissza a KONTEXTUS/FEJEZET/JELENET/MŰFAJ/POV KARAKTER/HELYSZÍN/IDŐ fejléceket — KIZÁRÓLAG prózát írj!`;

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
            model: AI_MODEL,
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
              model: AI_MODEL,
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

    // Post-hoc cleanups: chapter title dupe removal + character name consistency
    content = stripChapterTitleDupes(content, dbChapterTitle);
    const registeredNames = ((charactersResult?.data as Array<{ name: string }> | null) || []).map((c) => c.name);
    const recurringNameList = Object.keys(recurringNamesMap);
    const nameFix = validateAndFixCharacterNames(content, registeredNames, recurringNameList);
    if (Object.keys(nameFix.corrections).length > 0) {
      console.log(`[write-scene] Name corrections applied:`, nameFix.corrections);
      content = nameFix.text;
    }

    // Cliché-overflow hard check: if the scene would push a tracked cliché past
    // the per-chapter or per-book limit, log it (auto-lector handles substitution).
    try {
      const overflow = detectClicheOverflow(content, bookClicheCounts);
      if (overflow.overflow) {
        console.warn(`[write-scene] Cliché overflow on scene ${sceneNumber}:`, overflow.details);
      }
    } catch (e) {
      console.warn("[write-scene] Cliché overflow check failed:", e);
    }

    // Recurring-names tracking: capture recurring proper nouns that are NOT
    // registered characters but appear repeatedly — store them so future
    // chapters use the same name (prevents Viktor → Márk drift).
    try {
      const candidates = extractCandidateCharacterNames(content);
      const registeredSet = new Set(registeredNames.map((n) => n.split(/\s+/)[0]));
      const updates: Record<string, { role?: string; first_chapter?: number }> = { ...recurringNamesMap };
      let changed = false;
      for (const cand of candidates) {
        const firstToken = cand.split(/\s+/)[0];
        if (firstToken.length < 3) continue;
        if (registeredSet.has(firstToken)) continue;
        if (updates[firstToken]) continue; // already tracked
        // Count occurrences in scene; only promote if mentioned 2+ times
        const occ = (content.match(new RegExp(`\\b${firstToken}\\b`, "g")) || []).length;
        if (occ >= 2) {
          updates[firstToken] = { first_chapter: sceneOutline.chapter_index ? sceneOutline.chapter_index + 1 : undefined };
          changed = true;
        }
      }
      if (changed) {
        await supabase.from("projects").update({ recurring_names: updates }).eq("id", projectId);
        console.log(`[write-scene] Recurring names updated:`, Object.keys(updates));
      }
    } catch (e) {
      console.warn("[write-scene] Recurring names tracking failed:", e);
    }

    // Track this scene's cliché counts and persist into the chapter row
    try {
      const sceneClicheCounts = countCliches(content);
      const existingCounts =
        ((chapterRowResult?.data as { cliche_counts?: Record<string, number> } | null)?.cliche_counts) || {};
      const newCounts = mergeClicheCounts(existingCounts, sceneClicheCounts);
      await supabase.from("chapters").update({ cliche_counts: newCounts }).eq("id", chapterId);
    } catch (e) {
      console.warn("[write-scene] Failed to persist cliché counts:", e);
    }

    // Update usage
    if (project?.user_id && wordCount > 0) {
      await trackUsage(supabase, project.user_id, wordCount);
    }

    return new Response(JSON.stringify({ content, wordCount: countWords(content) }), {
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
