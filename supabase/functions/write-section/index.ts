import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const countWords = (text: string): number => text.trim().split(/\s+/).filter(w => w.length > 0).length;

const SECTION_PROMPTS: Record<string, string> = {
  intro: "Írj bevezető szekciót személyes történettel vagy figyelemfelkeltő problémával. Kezdj hook-kal!",
  concept: "Magyarázd el a fogalmat/módszert egyszerűen és gyakorlatiasan. Használj konkrét példákat.",
  example: "Adj részletes gyakorlati példákat és esettanulmányokat konkrét számokkal és eredményekkel.",
  exercise: "Készíts gyakorlatot vagy önértékelést amit az olvasó azonnal elvégezhet.",
  summary: "Foglald össze a fejezet kulcspontjait bullet point listában. Mit tanult meg az olvasó?",
  case_study: "Írj részletes esettanulmányt valós példával, számokkal és tanulságokkal.",
};

const NONFICTION_SYSTEM_PROMPT = `Te egy nemzetközileg elismert szakkönyv-író és coach vagy, aki a "Million Dollar Book Method" és a "StoryBrand" keretrendszerek alapján dolgozik. A célod, hogy egyetlen, rendkívül értékes és gyakorlatias szekciót írj meg, amely valódi transzformációt nyújt az olvasónak.

ALAPELVEK (KÖTELEZŐ ALKALMAZNI):

1.  **EGY PROBLÉMA, EGY MEGOLDÁS:** Minden szekció egyetlen, konkrét problémára fókuszáljon, és egyetlen, világos megoldást kínáljon rá.

2.  **AZONNALI GYAKORLATIASSÁG:** Az olvasónak éreznie kell, hogy a tanultakat azonnal alkalmazni tudja. Használj konkrét, lépésről-lépésre útmutatókat.

    -   PÉLDA: "Most pedig vedd elő a telefonod, nyisd meg a jegyzeteket, és írd le ezt a három mondatot..."

3.  **HITELESSÉG ÉS BIZALOMÉPÍTÉS:**

    -   **Személyes Történetek:** Kezdj egy rövid, releváns személyes történettel, ami bemutatja, hogy te is átmentél ezen a problémán.

    -   **Esettanulmányok:** Hozz legalább egy konkrét esettanulmányt (lehet anonimizált) egy ügyfeledről, aki a módszereddel ért el eredményt. Használj konkrét számokat!

    -   **Forráshivatkozás:** Ha külső adatot vagy kutatást említesz, jelezd a szövegben (pl. "[forrás: 1]").

4.  **STORYBRAND KERETRENDSZER (SB7):**

    -   **Az Olvasó a Hős:** Mindig az olvasó a hős, te (az író) vagy a segítő (Guide).

    -   **Probléma:** Világosan definiáld a problémát (külső, belső, filozófiai).

    -   **A Terv:** Add a kezébe egy egyszerű, 3-5 lépéses tervet.

    -   **Call to Action:** Minden szekció végén legyen egy egyértelmű felszólítás a cselekvésre.

5.  **"ZERO FLUFF" (NINCS TÖLTELÉK):**

    -   Minden mondatnak értéket kell adnia.

    -   Kerüld a közhelyeket, általánosításokat és a motivációs idézeteket.

    -   Legyél direkt, lényegre törő és tisztelettudó az olvasó idejével.

FORMAI KÖVETELMÉNYEK:

-   A válasz CSAK a megírt szekció szövege legyen.

-   NE írj összefoglalót vagy magyarázatot.

-   Használj rövid bekezdéseket (max. 3-4 mondat).

-   Használj informatív alcímeket (NAGYBETŰVEL, # nélkül).

-   Listákhoz használj számozást (1., 2., 3.) vagy gondolatjelet (–).

-   NE használj markdown formázást (pl. **, \`).`;

const FICTION_SYSTEM_PROMPT = `Te egy díjnyertes regényíró vagy, a magyar nyelv mestere. A feladatod, hogy egyetlen, lenyűgöző jelenetet írj meg a kapott instrukciók alapján.

KRITIKUS ÍRÁSI TECHNIKÁK (KÖTELEZŐ ALKALMAZNI):

1.  **SHOW, DON'T TELL (MUTASS, NE MONDJ):**

    -   ROSSZ: "Anna szomorú volt."

    -   JÓ: "Anna a szeme sarkát törölgette, és a tekintete a padlót fürkészte. Vállai megereszkedtek, és egy mély, remegő sóhaj szakadt ki belőle."

    -   ALKALMAZÁS: Érzelmeket, hangulatot és belső állapotokat mindig cselekedeteken, testbeszéden és érzékszervi részleteken keresztül mutass be.

2.  **MÉLY POV (POINT OF VIEW):**

    -   Lépj be a POV karakter fejébe. A narráció tükrözze az ő gondolatait, érzéseit, előítéleteit és hangulatát.

    -   Minden leírás (helyszín, másik karakter) legyen átszűrve a POV karakter szubjektív észlelésén.

    -   PÉLDA: Ha a karakter dühös, a leírás legyen szaggatott, a mondatok rövidek, a fókusz a zavaró részleteken.

3.  **ÉRZÉKSZERVI RÉSZLETEK (SENSORY DETAILS):**

    -   Minden jelenetben legalább 3-5 érzékszervre hass:

        -   **Látás:** Színek, fények, árnyékok, formák.

        -   **Hallás:** Hangok, zajok, csend, zene.

        -   **Szaglás:** Illatok, szagok.

        -   **Tapintás:** Textúrák, hőmérséklet, szél.

        -   **Ízlelés:** Ízek (ha releváns).

    -   PÉLDA: "A dohos pince nehéz, földes szaga megcsapta az orrát, miközben a hideg, nyirkos kőfalhoz ért a kezével."

4.  **EGYEDI PÁRBESZÉDEK:**

    -   Minden karakternek legyen egyedi "hangja" (character voice).

    -   A párbeszéd tükrözze a karakter személyiségét, hátterét és aktuális célját.

    -   Kerüld a felesleges üdvözléseket és small talk-ot. A párbeszéd mindig vigye előre a cselekményt vagy mélyítse a karaktereket.

    -   Használj szubtextust: a karakterek ne mindig azt mondják, amit gondolnak.

5.  **FESZÜLTSÉG ÉS TEMPÓ:**

    -   A mondatok hosszával és a bekezdések sűrűségével irányítsd a tempót.

    -   Akciójeleneteknél: Rövid, tőmondatok, gyors vágások.

    -   Elménkedő részeknél: Hosszabb, összetettebb mondatok.

    -   Minden jelenet végén hagyj egy "horgot" (hook), ami kíváncsivá teszi az olvasót a folytatásra.

FORMAI KÖVETELMÉNYEK:

-   A válasz CSAK a megírt jelenet szövege legyen.

-   NE írj összefoglalót vagy magyarázatot a szöveg elé vagy után.

-   Használj magyar párbeszéd-jelölést (–).

-   Tagold a szöveget logikus bekezdésekre.

-   NE használj markdown formázást (pl. **, #).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, chapterId, sectionNumber, sectionOutline, previousContent, bookTopic, targetAudience, chapterTitle, genre, authorProfile } = await req.json();
    if (!projectId || !chapterId || !sectionOutline) return new Response(JSON.stringify({ error: "Hiányzó mezők" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Create Supabase client for deep context fetching
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Fetch Full Project Details
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (projectError) console.warn('Could not fetch project details:', projectError.message);

    // 2. Fetch POV Character Details (including character_voice)
    const povCharacterId = sectionOutline.pov_character_id || sectionOutline.pov;
    let povCharacter: { name: string; character_voice: string | null } = { name: sectionOutline.pov || 'Unknown', character_voice: null };
    if (povCharacterId && typeof povCharacterId === 'string' && povCharacterId.includes('-')) {
      const { data: charData } = await supabaseClient
        .from('characters')
        .select('name, character_voice, positive_traits, negative_traits, backstory, speech_style')
        .eq('id', povCharacterId)
        .single();
      if (charData) {
        povCharacter = { name: charData.name, character_voice: charData.character_voice };
      }
    }

    // 3. Fetch Previous 3 Scenes/Sections Summaries from blocks table
    const previousScenes: { summary: string }[] = [];
    const { data: allBlocks } = await supabaseClient
      .from('blocks')
      .select('content, sort_order')
      .eq('chapter_id', chapterId)
      .order('sort_order', { ascending: true });
    if (allBlocks && sectionNumber > 1) {
      const startIdx = Math.max(0, sectionNumber - 4);
      const endIdx = sectionNumber - 1;
      for (let i = startIdx; i < endIdx && i < allBlocks.length; i++) {
        const block = allBlocks[i];
        const summary = (block.content || '').substring(0, 200) + '...';
        previousScenes.push({ summary });
      }
    }

    // 4. Fetch Research Sources (for nonfiction)
    const { data: sources } = await supabaseClient
      .from('sources')
      .select('title, url, notes')
      .eq('project_id', projectId);
    const sourcesList = sources || [];

    // 5. Determine Story Arc Position and Tension Level
    const totalSectionsInChapter = sectionOutline.total_sections || 5;
    const progressInChapter = sectionNumber / totalSectionsInChapter;
    let storyArcPosition = 'Középső rész';
    let tensionLevel = 'Közepes';
    if (progressInChapter < 0.3) {
      storyArcPosition = 'Felvezetés';
      tensionLevel = 'Alacsony';
    } else if (progressInChapter > 0.7) {
      storyArcPosition = 'Klimax felé';
      tensionLevel = 'Magas';
    }

    const isFiction = genre === "fiction" || (project?.genre && project.genre !== 'nonfiction' && project.genre !== 'szakkönyv' && project.genre !== 'szakkonyv');
    const sectionType = sectionOutline.pov || sectionOutline.type || "concept";
    const systemPrompt = isFiction ? FICTION_SYSTEM_PROMPT : NONFICTION_SYSTEM_PROMPT;
    
    // Build rich context-aware prompt
    const userPrompt = isFiction
      ? `CONTEXT:
- KÖNYV MŰFAJA: ${project?.genre || genre || 'fiction'}
- KÖNYV HANGNEME: ${project?.tone || 'Általános'}
- KÖNYV CÉLKÖZÖNSÉGE: ${project?.target_audience || targetAudience || 'Felnőtt olvasók'}
- KÖNYV ALAPTÖRTÉNETE: ${project?.story_idea || 'Nincs megadva'}

JELENET DRAMATURGIÁJA:
- TÖRTÉNETI ÍV POZÍCIÓ: Ez a jelenet a történet ${storyArcPosition} részében van.
- FESZÜLTSÉG SZINTJE: ${tensionLevel}. A jelenetnek ezt a feszültséget kell tükröznie.

KARAKTER INFORMÁCIÓK:
- POV KARAKTER NEVE: ${povCharacter.name}
- POV KARAKTER HANGJA ÉS STÍLUSA: ${povCharacter.character_voice || 'Standard narráció, semleges hang.'}
- POV KARAKTER CÉLJA A JELENETBEN: ${sectionOutline.pov_goal || 'Nincs megadva'}
- POV KARAKTER ÉRZELMI ÁLLAPOTA A JELENET ELEJÉN: ${sectionOutline.pov_emotion_start || 'Semleges'}

ELŐZMÉNYEK (AZ ELŐZŐ JELENETEK RÖVID ÖSSZEFOGLALÓJA):
${previousScenes.length > 0 ? previousScenes.map((s, i) => `${i + 1}. ${s.summary}`).join('\n') : 'Ez az első jelenet a fejezetben.'}

ELŐZŐ SZÖVEGRÉSZ (az utolsó 4000 karakter a folytonosság érdekében):
${(previousContent || '').slice(-4000)}

---
ÍRÁSI FELADAT:
Írd meg az alábbi jelenetet a fenti kontextus és a "Mély POV" technika maximális figyelembevételével. A narráció és minden leírás a POV karakter szemszögéből történjen, az ő hangján és érzelmi állapotán keresztül.

- FEJEZET CÍME: "${chapterTitle}"
- JELENET SORSZÁMA: ${sectionNumber}
- JELENET CÍME: "${sectionOutline.title}"
- HELYSZÍN: ${sectionOutline.location || 'Nincs megadva'}
- IDŐ: ${sectionOutline.time || 'Nincs megadva'}
- JELENET LEÍRÁSA: ${sectionOutline.description}
- KULCSESEMÉNYEK (ezeknek kötelezően meg kell történniük): ${(sectionOutline.key_events || []).join(', ')}
- ÉRZELMI ÍV: ${sectionOutline.emotional_arc || 'Nincs megadva'}
- VÁRHATÓ ÉRZELMI VÁLTOZÁS A JELENET VÉGÉRE: A karakter ${sectionOutline.pov_emotion_start || 'semleges'} állapotból ${sectionOutline.pov_emotion_end || 'változatlan'} állapotba jut.
- CÉLHOSSZ: ~${sectionOutline.target_words || 1500} szó

CSAK a jelenet szövegét add vissza, mindenféle bevezető vagy záró kommentár nélkül.`
      : `CONTEXT:
- KÖNYV NAGY ÍGÉRETE: ${project?.description || bookTopic || 'Nincs megadva'}
- CÉLKÖZÖNSÉG: ${project?.target_audience || targetAudience || 'Általános közönség'}
- CÉLKÖZÖNSÉG RÉSZLETES LEÍRÁSA: ${project?.audience_level || 'Általános'}
- SZERZŐI PROFIL: ${authorProfile?.bio || project?.author_profile?.bio || 'Szakértő a témában'}
- EGYEDI MÓDSZERTAN/KERETRENDSZER: ${authorProfile?.methodology || project?.author_profile?.methodology || 'Nincs megadva'}
${authorProfile?.formality === "magaz" ? "- MEGSZÓLÍTÁS: Magázó forma (Ön)" : "- MEGSZÓLÍTÁS: Tegező forma (Te)"}

KUTATÁSI ANYAGOK (releváns források a kijelentések alátámasztásához):
${sourcesList.length > 0 ? sourcesList.map((s, i) => `- [forrás: ${i + 1}] ${s.title}: ${s.notes || 'Nincs összefoglaló'}`).join('\n') : 'Nincsenek külső források. Támaszkodj a szerzői profilra és a módszertanra.'}

ELŐZŐ SZÖVEGRÉSZ (az utolsó 4000 karakter a folytonosság érdekében):
${(previousContent || '').slice(-4000)}

---
ÍRÁSI FELADAT:
Írd meg az alábbi szakkönyv szekciót a fenti kontextus és a "StoryBrand" keretrendszer maximális figyelembevételével. Az olvasó a hős, te vagy a segítő. Adj neki egy világos tervet és hívd cselekvésre.

- FEJEZET CÍME: "${chapterTitle}"
- SZEKCIÓ SORSZÁMA: ${sectionNumber}
- SZEKCIÓ CÍME: "${sectionOutline.title}"
- SZEKCIÓ TÍPUSA: ${sectionType}
- FELADAT: ${SECTION_PROMPTS[sectionType] || "Írj tartalmas szekciót."}
- SZEKCIÓ CÉLJA (TANULÁSI EREDMÉNY): ${sectionOutline.description || 'Az olvasó megérti és alkalmazni tudja a tartalmat.'}
- KULCSPONTOK (ezeket kötelezően fejtsd ki részletesen, példákkal):
${(sectionOutline.key_events || []).map((p: string, i: number) => `${i+1}. ${p}`).join('\n')}
- CÉLHOSSZ: ~${sectionOutline.target_words || 1500} szó

FORMÁZÁSI KÖVETELMÉNYEK:
- Használj alcímeket ha a szekció hosszabb
- Használj bullet point listákat a kulcspontoknál
- Használj számozott lépéseket a folyamatoknál
- A szekció végén készíts átvezetést a következőhöz

CSAK a szekció szövegét add vissza, mindenféle bevezető vagy záró kommentár nélkül.`;

    // Rock-solid retry logic with max resilience
    const maxRetries = 7;
    const MAX_TIMEOUT = 120000; // 2 minutes
    let lastError: Error | null = null;
    let sectionContent = "";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT);

        console.log(`AI request attempt ${attempt}/${maxRetries} for section ${sectionNumber}`);

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { 
            "x-api-key": ANTHROPIC_API_KEY, 
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ 
            model: "claude-sonnet-4-20250514", 
            max_tokens: 8192,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limit (429), gateway errors (502/503/504)
        if (response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504 || response.status === 529) {
          const statusText = response.status === 429 ? "Rate limit" : `Gateway ${response.status}`;
          console.error(`${statusText} (attempt ${attempt}/${maxRetries})`);
          
          if (attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            console.log(`Waiting ${delay/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később" }), { 
              status: 429, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }
          return new Response(JSON.stringify({ error: "AI szolgáltatás túlterhelt" }), { 
            status: 503, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error("AI API error:", response.status, errorText.substring(0, 200));
          
          // Retry on 5xx errors
          if (response.status >= 500 && attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("AI hiba");
        }

        // Parse response safely
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error(`JSON parse error (attempt ${attempt}/${maxRetries}):`, parseError);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Hibás API válasz formátum");
        }

        sectionContent = data.content?.[0]?.text || "";

        // Retry on empty or too short response
        if (!sectionContent || sectionContent.trim().length < 100) {
          console.warn(`Empty/too short AI response (attempt ${attempt}/${maxRetries}), length: ${sectionContent?.length || 0}`);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Az AI nem tudott megfelelő választ generálni");
        }

        // Success
        console.log(`AI response received, length: ${sectionContent.length}`);
        break;

      } catch (fetchError) {
        lastError = fetchError as Error;
        if ((fetchError as Error).name === "AbortError") {
          console.error(`Timeout after ${MAX_TIMEOUT/1000}s (attempt ${attempt}/${maxRetries})`);
        } else {
          console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
        }
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return new Response(JSON.stringify({ error: lastError?.message || "Időtúllépés" }), { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (!sectionContent || sectionContent.trim().length < 100) {
      return new Response(JSON.stringify({ error: "A generálás sikertelen" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const wordCount = countWords(sectionContent);

    if (wordCount > 0) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: project } = await supabase.from("projects").select("user_id").eq("id", projectId).single();
      if (project?.user_id) {
        const month = new Date().toISOString().slice(0, 7);
        const { data: profile } = await supabase.from("profiles").select("monthly_word_limit, extra_words_balance").eq("user_id", project.user_id).single();
        const { data: usage } = await supabase.from("user_usage").select("words_generated").eq("user_id", project.user_id).eq("month", month).single();
        const limit = profile?.monthly_word_limit || 5000, used = usage?.words_generated || 0, extra = profile?.extra_words_balance || 0, remaining = Math.max(0, limit - used);
        if (limit === -1 || wordCount <= remaining) await supabase.rpc("increment_words_generated", { p_user_id: project.user_id, p_word_count: wordCount });
        else { if (remaining > 0) await supabase.rpc("increment_words_generated", { p_user_id: project.user_id, p_word_count: remaining }); const fromExtra = Math.min(wordCount - remaining, extra); if (fromExtra > 0) await supabase.rpc("use_extra_credits", { p_user_id: project.user_id, p_word_count: fromExtra }); }
      }
    }

    return new Response(JSON.stringify({ content: sectionContent, wordCount }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
