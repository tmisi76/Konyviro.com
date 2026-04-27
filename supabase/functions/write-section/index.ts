import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadSeriesContext, buildSeriesContextPrompt } from "../_shared/series-context.ts";
import { getAISettings } from "../_shared/ai-settings.ts";
import { detectRepetition } from "../_shared/repetition-detector.ts";
import { checkSceneQuality, stripMarkdown } from "../_shared/quality-checker.ts";
import { trackUsage } from "../_shared/usage-tracker.ts";
import {
  countCliches,
  mergeClicheCounts,
  buildClicheBlocklistPrompt,
} from "../_shared/cliche-tracker.ts";
import {
  validateAndFixCharacterNames,
  stripChapterTitleDupes,
} from "../_shared/name-consistency.ts";
import {
  HUNGARIAN_GRAMMAR_RULES,
  buildCharacterContext,
  buildCharacterNameLock,
  buildCharacterHistoryContext,
  buildPOVEnforcement,
  buildScenePositionContext,
  buildAntiSummaryRules,
  buildDialogueVarietyRules,
  buildBodyLanguageVarietyRules,
  buildSceneOpeningRules,
  buildAntiRepetitionPrompt,
  buildPreviousChaptersSummary,
  buildFictionStylePrompt,
  buildStylePrompt,
  buildInvestigativeResearchBlock,
} from "../_shared/prompt-builder.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
// Word-compatible counting: only tokens containing at least one letter
const countWords = (text: string): number => text.trim().split(/\s+/).filter(w => /[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(w)).length;

const SECTION_PROMPTS: Record<string, string> = {
  intro: "Írj bevezető szekciót személyes történettel vagy figyelemfelkeltő problémával. Kezdj hook-kal!",
  concept: "Magyarázd el a fogalmat/módszert egyszerűen és gyakorlatiasan. Használj konkrét példákat.",
  example: "Adj részletes gyakorlati példákat és esettanulmányokat konkrét számokkal és eredményekkel.",
  exercise: "Készíts gyakorlatot vagy önértékelést amit az olvasó azonnal elvégezhet.",
  summary: "Foglald össze a fejezet kulcspontjait bullet point listában. Mit tanult meg az olvasó?",
  case_study: "Írj részletes esettanulmányt valós példával, számokkal és tanulságokkal.",
  evidence: "Mutasd be a bizonyítékot részletesen: mit mond a dokumentum, ki mondta, mit jelent. Az olvasó lássa a tényeket.",
  investigation: "Vezesd az olvasót a nyomozás következő lépésén. Mi derült ki? Hogyan jutottunk el ide? Mi a következő kérdés?",
  revelation: "Drámai fordulópont: ami eddig rejtve volt, most napvilágra kerül. Feszültségépítés a leleplezés előtt.",
  consequences: "Mutasd be a következményeket: mi változott, ki járt rosszul, milyen hatása volt a feltárásnak.",
};

const INVESTIGATIVE_SYSTEM_PROMPT = `Te egy díjnyertes oknyomozó újságíró és könyvíró vagy. A feladatod egyetlen lenyűgöző szekciót megírni egy dokumentumfilm-szerű, tényalapú oknyomozó könyvhöz.

STÍLUS — HIBRID: TÉNYALAPÚ + FESZÜLTSÉGÉPÍTÉS:

1. **JELENETEZÉS TÉNYEKKEL**: Ne csak mondd el mi történt — MUTASD MEG. Írj jeleneteket ahol az olvasó "ott van" az eseményeknél.
   - ROSSZ: "2015-ben a miniszter egy korrupciós ügybe keveredett."
   - JÓ: "2015. március 12-én, egy hétfő reggel, amikor a miniszter még a harmadik kávéját kortyolgatta az irodájában, egy névtelen boríték érkezett a szerkesztőség címére. Benne három oldalnyi bankkivonat, piros filctollal aláhúzott sorokkal."

2. **BIZONYÍTÉKOK INLINE**: Dátumok, dokumentum-részletek, idézetek szervesen a szövegbe építve.
   - "A 2017. június 4-i szerződés — amelyet a nyilvánosság számára soha nem hoztak nyilvánosságra — egyértelműen kimondta: »A kedvezményezett kizárólagos jogot kap...«"

3. **FESZÜLTSÉGÉPÍTÉS**: Minden szekció végén nyitott kérdés vagy következő szál.
   - "De ha ez igaz volt, akkor ki hagyta jóvá a tranzakciót? A válasz a következő dokumentumban rejtőzött."

4. **AZ OKNYOMOZÓ HANGJA**: Személyes, de professzionális. Reflexiók a feltárás közben.
   - "Amikor először olvastam ezeket a számokat, nem akartam hinni a szememnek. De a dokumentumok nem hazudnak."

5. **"KÖVETSD A PÉNZT" LOGIKA**: Minden állítás bizonyítékra épül. Számok, dátumok, nevek.

FORMAI KÖVETELMÉNYEK:
- A válasz CSAK a megírt szekció szövege legyen
- NE használj markdown formázást (**, ##)
- Használj rövid bekezdéseket (max 3-4 mondat)
- Idézeteket „magyar idézőjelben" adj meg
- TILOS a CSUPA NAGYBETŰS írás
${HUNGARIAN_GRAMMAR_RULES}`;




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

-   Alcímekhez használj normál mondatformátumot új sorban (pl. "Az első lépés" - NEM "AZ ELSŐ LÉPÉS").

-   Listákhoz használj számozást (1., 2., 3.) vagy gondolatjelet (–).

-   NE használj markdown formázást (**, ##, \`\`\`).

-   TILOS a CSUPA NAGYBETŰS írás, kivéve rövidítéseket (EU, AI, stb.).
${HUNGARIAN_GRAMMAR_RULES}`;

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

## 4b. TILTOTT TÖRTÉNETKLISÉK (NE HASZNÁLD EZEKET!)

AZ ALÁBBI ELEMEK TILTOTTAK, mert túlhasznált AI-sablonok:

HELYSZÍNEK ÉS TÁRGYAK:

- Fekete, sötétített üveges terepjárók/SUV-ok mint fenyegető jelenlét

- Titkos alagutak és rejtett szobák mint menekülési útvonal

- Elhagyatott raktárak/gyárak mint titkos találkozóhely

- Laptop/monitor "kékes fénye" (TILTOTT kifejezés!)

- Pendrive mint a "kulcsbizonyíték" — használj változatosabb adathordozókat vagy módszereket

KARAKTEREK:

- Arctalan, névtelen verőemberek/bérgyilkosok — adj nekik személyiséget, motivációt, apró részleteket

- A "mindentudó, mindenható" főgonosz aki egyetlen telefonhívással mindent elintéz — a gonosz is legyen esendő, hibázzon, legyen bizonytalan

- A "kiégett, alkoholista, de zseniális" főhős — adj komplexebb hátteret

- A "hűséges női mellékszereplő" aki csak segít és aggódik — adj neki saját célokat, motivációt, esetleg ellentétes véleményt

CSELEKMÉNY:

- "Telefonhívás a sötétben" mint feszültségépítő eszköz — MAXIMUM 2x könyvenként!

- "Menekülés a sikátoron/erdőn/alagúton keresztül" — MAXIMUM 1x könyvenként

- Az összes probléma megoldása egyetlen hacker-jelenettel

- "A főhős megtalálja a kulcsbizonyítékot az utolsó pillanatban"

EHELYETT:

- A gonosz legyen EMBERI: legyen családja, hobbija, félelme, jó tulajdonságai is

- A feszültség jöjjön a BELSŐ konfliktusból, nem csak a külső fenyegetésből

- A helyszínek legyenek HÉTKÖZNAPIAK de félelmetesek: irodaház, bevásárlóközpont, családi vacsora, iskolai szülői értekezlet

- A bizonyítékok legyenek SZÉTSZÓRTAK és NEHEZEN ÖSSZERAKHATÓK, ne egyetlen "csodafegyver"

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, chapterId, sectionNumber, sectionOutline, previousContent, bookTopic, targetAudience, chapterTitle, genre, authorProfile, previousChapterSummaries } = await req.json();
    if (!projectId || !chapterId || !sectionOutline) return new Response(JSON.stringify({ error: "Hiányzó mezők" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Create Supabase client for deep context fetching
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch AI generation settings
    const aiSettings = await getAISettings(supabaseUrl, serviceRoleKey);

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

    // 5. Fetch ALL characters for this project (context + name lock)
    const { data: allCharacters } = await supabaseClient
      .from('characters')
      .select('name, role, positive_traits, negative_traits, speech_style, development_arc, backstory, motivations, character_voice')
      .eq('project_id', projectId);

    // 6. Fetch chapter info for scene position context
    const { data: allChapters } = await supabaseClient
      .from('chapters')
      .select('id, sort_order, scene_outline, title, summary, character_appearances, cliche_counts')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    const totalChapters = allChapters?.length || 1;
    const currentChapter = allChapters?.find(ch => ch.id === chapterId);
    const chapterIndex = currentChapter ? allChapters!.indexOf(currentChapter) : 0;
    const sceneOutlineArray = (currentChapter?.scene_outline as unknown[]) || [];
    const totalScenes = sceneOutlineArray.length || 1;
    const currentSortOrder = currentChapter?.sort_order || 0;

    // Aggregate cliché counts across the whole book so far (for the blocklist prompt)
    const bookClicheCounts: Record<string, number> = {};
    for (const ch of allChapters || []) {
      const cc = (ch.cliche_counts as Record<string, number> | null) || {};
      for (const [k, v] of Object.entries(cc)) {
        bookClicheCounts[k] = (bookClicheCounts[k] || 0) + (Number(v) || 0);
      }
    }
    const clicheBlocklistBlock = buildClicheBlocklistPrompt(bookClicheCounts);
    const dbChapterTitle = currentChapter?.title || chapterTitle;
    const titleDupeBan = dbChapterTitle
      ? `\n\n## FEJEZETCÍM TILALOM:\n- A fejezet címe ("${dbChapterTitle}") TILTOTT belső szakasz-fejlécként vagy önálló sorként a próza belsejében.\n- NE írd újra a fejezetcímet a jeleneten belül, NE használd alcímként, NE ismételd meg sehol a szövegben.`
      : "";

    // 6b. Build character history from previous chapters
    const prevChaptersForHistory = allChapters?.filter(ch => ch.character_appearances && ch.sort_order < currentSortOrder) || [];

    // 7. Determine Story Arc Position and Tension Level
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
    const isInvestigative = !isFiction && project?.nonfiction_book_type === "investigative";
    const sectionType = sectionOutline.pov || sectionOutline.type || "concept";
    let systemPrompt = isFiction ? FICTION_SYSTEM_PROMPT : (isInvestigative ? INVESTIGATIVE_SYSTEM_PROMPT : NONFICTION_SYSTEM_PROMPT);

    if (isFiction && project) {
      // Add fiction style settings (POV, pace, dialogue, description, genre rules)
      const fictionStyleSection = buildFictionStylePrompt(
        project.fiction_style as Record<string, unknown> | null,
        project.subcategory || null
      );
      if (fictionStyleSection) {
        systemPrompt += fictionStyleSection;
      }
    }

    // Add user writing style profile if available — for ALL book types (fiction + non-fiction)
    if (project?.user_id) {
      const { data: styleProfile } = await supabaseClient
        .from('user_style_profiles')
        .select('*')
        .eq('user_id', project.user_id)
        .single();

      if (styleProfile?.style_summary) {
        systemPrompt += buildStylePrompt(styleProfile as Record<string, unknown>);
      }
    }

    // Investigative real-case research dossier (Perplexity) — anti-hallucination guard
    if (isInvestigative && projectId) {
      try {
        const { data: research } = await supabaseClient
          .from('project_research')
          .select('research_data, sources')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (research?.research_data) {
          const block = buildInvestigativeResearchBlock(research.research_data, research.sources);
          if (block) systemPrompt += block;
        }
      } catch (e) {
        console.error("Failed to load project_research", e);
      }
    }

    // Series context — if this project belongs to a series, inject canonical world / characters / events
    try {
      const seriesCtx = await loadSeriesContext(supabaseClient, projectId);
      const seriesPrompt = buildSeriesContextPrompt(seriesCtx);
      if (seriesPrompt) systemPrompt += seriesPrompt;
    } catch (e) {
      console.error("Failed to load series context", e);
    }

    // Build rich context-aware prompt
    // Extract story context from generated_story for richer prompt
    let bookStoryContext = project?.story_idea || 'Nincs megadva';
    const genStoryData = project?.generated_story as Record<string, unknown> | null;
    if (genStoryData) {
      const parts: string[] = [];
      if (genStoryData.synopsis) parts.push(String(genStoryData.synopsis));
      if (Array.isArray(genStoryData.themes) && genStoryData.themes.length) {
        parts.push(`Témák: ${(genStoryData.themes as string[]).join(", ")}`);
      }
      if (Array.isArray(genStoryData.plotPoints)) {
        const points = (genStoryData.plotPoints as Array<{beat: string; description: string}>).slice(0, 4);
        parts.push(`Cselekménypontok: ${points.map(p => `${p.beat}: ${p.description}`).join("; ")}`);
      }
      if (genStoryData.narrative_style) {
        const ns = genStoryData.narrative_style as { label: string; moodWords: string };
        parts.push(`Narratív stílus: ${ns.label} (${ns.moodWords})`);
      }
      if (parts.length) bookStoryContext = parts.join("\n");
    }

    // Build shared prompt blocks for fiction
    const povCharacterName = povCharacter.name || sectionOutline.pov || undefined;
    const characterContextBlock = isFiction ? buildCharacterContext(allCharacters || null) : "";
    const characterNameLockBlock = isFiction ? buildCharacterNameLock(allCharacters || null) : "";
    const characterHistoryBlock = isFiction ? buildCharacterHistoryContext(
      prevChaptersForHistory.map(ch => ch.character_appearances as Array<{ name: string; actions: string[] }>)
    ) : "";
    const povEnforcementBlock = isFiction ? buildPOVEnforcement(sectionOutline.pov || null, (project?.fiction_style as Record<string, unknown>)?.pov as string || null, povCharacterName) : "";
    const scenePositionBlock = isFiction ? buildScenePositionContext(sectionNumber - 1, totalScenes, chapterIndex, totalChapters) : "";
    const antiSummaryBlock = isFiction ? buildAntiSummaryRules() : "";
    const dialogueVarietyBlock = isFiction ? buildDialogueVarietyRules() : "";
    const bodyLanguageVarietyBlock = isFiction ? buildBodyLanguageVarietyRules() : "";
    const sceneOpeningRulesBlock = isFiction ? buildSceneOpeningRules() : "";
    const antiRepetitionBlock = isFiction ? buildAntiRepetitionPrompt((previousContent || '').slice(-2000)) : "";
    const previousChaptersSummaryBlock = isFiction && allChapters ? buildPreviousChaptersSummary(allChapters, currentSortOrder) : "";

    const userPrompt = isFiction
      ? `CONTEXT:
- KÖNYV MŰFAJA: ${project?.genre || genre || 'fiction'}
- KÖNYV HANGNEME: ${project?.tone || 'Általános'}
- KÖNYV CÉLKÖZÖNSÉGE: ${project?.target_audience || targetAudience || 'Felnőtt olvasók'}
- KÖNYV ALAPTÖRTÉNETE: ${bookStoryContext}

JELENET DRAMATURGIÁJA:
- TÖRTÉNETI ÍV POZÍCIÓ: Ez a jelenet a történet ${storyArcPosition} részében van.
- FESZÜLTSÉG SZINTJE: ${tensionLevel}. A jelenetnek ezt a feszültséget kell tükröznie.

KARAKTER INFORMÁCIÓK:
- POV KARAKTER NEVE: ${povCharacter.name}
- POV KARAKTER HANGJA ÉS STÍLUSA: ${povCharacter.character_voice || 'Standard narráció, semleges hang.'}
- POV KARAKTER CÉLJA A JELENETBEN: ${sectionOutline.pov_goal || 'Nincs megadva'}
- POV KARAKTER ÉRZELMI ÁLLAPOTA A JELENET ELEJÉN: ${sectionOutline.pov_emotion_start || 'Semleges'}
${characterContextBlock}
${characterNameLockBlock}
${povEnforcementBlock}
${characterHistoryBlock}

ELŐZŐ FEJEZETEK ÖSSZEFOGLALÓJA:
${previousChaptersSummaryBlock || 'Ez az első fejezet.'}

ELŐZMÉNYEK (AZ ELŐZŐ JELENETEK RÖVID ÖSSZEFOGLALÓJA):
${previousScenes.length > 0 ? previousScenes.map((s, i) => `${i + 1}. ${s.summary}`).join('\n') : 'Ez az első jelenet a fejezetben.'}

ELŐZŐ SZÖVEGRÉSZ (az utolsó 4000 karakter a folytonosság érdekében):
${(previousContent || '').slice(-4000)}
${antiRepetitionBlock}

---
ÍRÁSI FELADAT:
Írd meg az alábbi jelenetet a fenti kontextus és a "Mély POV" technika maximális figyelembevételével. A narráció és minden leírás a POV karakter szemszögéből történjen, az ő hangján és érzelmi állapotán keresztül.

- FEJEZET CÍME: "${chapterTitle}"
${scenePositionBlock}
- JELENET SORSZÁMA: ${sectionNumber}
- JELENET CÍME: "${sectionOutline.title}"
- HELYSZÍN: ${sectionOutline.location || 'Nincs megadva'}
- IDŐ: ${sectionOutline.time || 'Nincs megadva'}
- JELENET LEÍRÁSA: ${sectionOutline.description}
${antiSummaryBlock}
${dialogueVarietyBlock}
${bodyLanguageVarietyBlock}
${sceneOpeningRulesBlock}
- KULCSESEMÉNYEK (ezeknek kötelezően meg kell történniük): ${(sectionOutline.key_events || []).join(', ')}
- ÉRZELMI ÍV: ${sectionOutline.emotional_arc || 'Nincs megadva'}
- VÁRHATÓ ÉRZELMI VÁLTOZÁS A JELENET VÉGÉRE: A karakter ${sectionOutline.pov_emotion_start || 'semleges'} állapotból ${sectionOutline.pov_emotion_end || 'változatlan'} állapotba jut.
- CÉLHOSSZ: ~${sectionOutline.target_words || 1500} szó

CSAK a jelenet szövegét add vissza, mindenféle bevezető vagy záró kommentár nélkül. NE ismételd vissza a CONTEXT/FEJEZET/JELENET/MŰFAJ/POV KARAKTER/HELYSZÍN/IDŐ fejléceket — KIZÁRÓLAG prózát írj!`
      : isInvestigative
      ? `CONTEXT:
- KÖNYV TÍPUSA: Oknyomozó könyv
- VIZSGÁLAT TÁRGYA: ${project?.description || bookTopic || 'Nincs megadva'}
- CÉLKÖZÖNSÉG: ${project?.target_audience || targetAudience || 'Általános közönség'}
- KÖZPONTI KÉRDÉS: ${(project?.book_type_data as Record<string, unknown>)?.centralQuestion || 'Nincs megadva'}
- VIZSGÁLT IDŐSZAK: ${(project?.book_type_data as Record<string, unknown>)?.timelinePeriod || 'Nincs megadva'}
- FŐBB SZEREPLŐK: ${(project?.book_type_data as Record<string, unknown>)?.keyPlayers || 'Nincs megadva'}
- BIZONYÍTÉKTÍPUSOK: ${((project?.book_type_data as Record<string, unknown>)?.evidenceTypes as string[] || []).join(', ') || 'Dokumentumok, interjúk'}
- HANGNEM: ${(project?.book_type_data as Record<string, unknown>)?.investigationTone || 'dramatic'}
${(project?.book_type_data as Record<string, unknown>)?.investigatorRole === "first-person" ? "- NARRÁCIÓ: Első személy — az oknyomozó mesél (Én)" : (project?.book_type_data as Record<string, unknown>)?.investigatorRole === "team" ? "- NARRÁCIÓ: Többes szám — csapat mesél (Mi)" : "- NARRÁCIÓ: Harmadik személy — semleges narrátor"}

ELŐZŐ FEJEZETEK ÖSSZEFOGLALÓJA:
${previousChapterSummaries || 'Ez az első fejezet.'}

ELŐZŐ SZÖVEGRÉSZ (az utolsó 4000 karakter a folytonosság érdekében):
${(previousContent || '').slice(-4000)}

---
ÍRÁSI FELADAT:
Írd meg az alábbi oknyomozó szekciót. Az olvasó az oknyomozóval együtt fedezi fel az igazságot — építs feszültséget, mutass bizonyítékokat, és minden szekció végén nyiss új kérdést.

- FEJEZET CÍME: "${chapterTitle}"
- SZEKCIÓ SORSZÁMA: ${sectionNumber}
- SZEKCIÓ CÍME: "${sectionOutline.title}"
- SZEKCIÓ TÍPUSA: ${sectionType}
- FELADAT: ${SECTION_PROMPTS[sectionType] || "Írj tartalmas oknyomozó szekciót bizonyítékokkal és feszültséggel."}
- SZEKCIÓ CÉLJA: ${sectionOutline.description || 'Az olvasó megérti a bizonyítékok súlyát és a következő szálat.'}
- KULCSPONTOK (ezeket kötelezően fejtsd ki):
${(sectionOutline.key_events || []).map((p: string, i: number) => `${i+1}. ${p}`).join('\n')}
- CÉLHOSSZ: ~${sectionOutline.target_words || 1500} szó

CSAK a szekció szövegét add vissza, mindenféle bevezető vagy záró kommentár nélkül. NE ismételd vissza a CONTEXT/FEJEZET/SZEKCIÓ/MŰFAJ fejléceket — KIZÁRÓLAG prózát írj!`
      : `CONTEXT:
- KÖNYV NAGY ÍGÉRETE: ${project?.description || bookTopic || 'Nincs megadva'}
- CÉLKÖZÖNSÉG: ${project?.target_audience || targetAudience || 'Általános közönség'}
- CÉLKÖZÖNSÉG RÉSZLETES LEÍRÁSA: ${project?.audience_level || 'Általános'}
- SZERZŐI PROFIL: ${authorProfile?.bio || project?.author_profile?.bio || 'Szakértő a témában'}
- EGYEDI MÓDSZERTAN/KERETRENDSZER: ${authorProfile?.methodology || project?.author_profile?.methodology || 'Nincs megadva'}
${authorProfile?.formality === "magaz" ? "- MEGSZÓLÍTÁS: Magázó forma (Ön)" : "- MEGSZÓLÍTÁS: Tegező forma (Te)"}

KUTATÁSI ANYAGOK (releváns források a kijelentések alátámasztásához):
${sourcesList.length > 0 ? sourcesList.map((s, i) => `- [forrás: ${i + 1}] ${s.title}: ${s.notes || 'Nincs összefoglaló'}`).join('\n') : 'Nincsenek külső források. Támaszkodj a szerzői profilra és a módszertanra.'}

ELŐZŐ FEJEZETEK ÖSSZEFOGLALÓJA:
${previousChapterSummaries || 'Ez az első fejezet.'}

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

CSAK a szekció szövegét add vissza, mindenféle bevezető vagy záró kommentár nélkül. NE ismételd vissza a CONTEXT/FEJEZET/SZEKCIÓ/MŰFAJ fejléceket — KIZÁRÓLAG prózát írj!`;

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

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            max_tokens: 8192,
            temperature: aiSettings.temperature,
            frequency_penalty: aiSettings.frequency_penalty,
            presence_penalty: aiSettings.presence_penalty,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ]
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

        sectionContent = data.choices?.[0]?.message?.content || "";

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

    // Check for repetitive content and clean if needed
    const repetitionCheck = detectRepetition(sectionContent);
    if (repetitionCheck.isRepetitive) {
      console.warn(`Repetition detected in section (score: ${repetitionCheck.score.toFixed(2)}), using cleaned text`);
      sectionContent = repetitionCheck.cleanedText;
    }

    // Quality check: strip markdown remnants and log issues
    const qualityResult = checkSceneQuality(sectionContent, sectionOutline.target_words || 1500);
    if (!qualityResult.passed) {
      console.warn(`Quality issues in section ${sectionNumber}: ${qualityResult.issues.join("; ")}`);
      // Auto-fix: strip markdown if detected
      if (qualityResult.issues.some((i: string) => i.includes("Markdown"))) {
        sectionContent = stripMarkdown(sectionContent);
        console.log("Auto-stripped markdown from section content");
      }
    }

    const wordCount = countWords(sectionContent);

    if (wordCount > 0) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: project } = await supabase.from("projects").select("user_id").eq("id", projectId).single();
      if (project?.user_id) {
        await trackUsage(supabase, project.user_id, wordCount);
      }
    }

    return new Response(JSON.stringify({ content: sectionContent, wordCount }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
