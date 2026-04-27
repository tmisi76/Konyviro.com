import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings } from "../_shared/ai-settings.ts";

// Nationality / language guide for character names. The AI generates names
// itself based on the chosen cultural background instead of using a fixed list.
const NATIONALITY_GUIDE: Record<string, string> = {
  hungarian:    "magyar nevek (vezetéknév + keresztnév sorrend, pl. Kovács Anna, Nagy Bence, Tóth Eszter, Szilágyi Márton). Használj változatos magyar vezetékneveket, NE csak a Kovács/Nagy/Szabó hármast.",
  english:      "brit angol nevek (pl. James Whitmore, Eleanor Hayes, Oliver Bennett, Charlotte Ashford)",
  american:     "amerikai nevek, etnikailag változatos összetétellel (pl. Marcus Reed, Sofia Castillo, Tyler Brooks, Jasmine Carter)",
  german:       "német nevek (pl. Lukas Hoffmann, Anna Becker, Felix Wagner, Lena Schmidt)",
  french:       "francia nevek (pl. Julien Moreau, Camille Lefèvre, Antoine Dubois, Élodie Rousseau)",
  spanish:      "spanyol vagy latin-amerikai nevek (pl. Diego Herrera, Lucía Morales, Mateo Ramírez, Valentina Castro)",
  italian:      "olasz nevek (pl. Matteo Ricci, Giulia Conti, Lorenzo Romano, Sofia Bianchi)",
  scandinavian: "skandináv nevek (pl. Lars Eriksson, Astrid Lindqvist, Mikael Berg, Freya Olsen)",
  japanese:     "japán nevek (vezetéknév + keresztnév sorrend, pl. Tanaka Haruki, Sato Yuki, Yamamoto Kenji, Nakamura Aiko)",
  russian:      "orosz nevek (pl. Dmitri Volkov, Anastasia Sokolova, Nikolai Petrov, Irina Romanova)",
  mixed:        "nemzetközileg vegyes nevek többféle kulturális háttérből (európai, amerikai, ázsiai keverve)",
  fantasy:      "kitalált, fantasy stílusú nevek (NEM létező kultúrákból kölcsönözve, hanem eredeti hangzású nevek)",
  ai_choose:    "a történet helyszínéhez, korszakához és kulturális kontextusához illő nevek — ha a helyszín pl. London, akkor angol, ha Tokió, akkor japán, ha nincs egyértelmű helyszín, akkor a kontextushoz illő",
};

const NARRATIVE_STYLES = [
  {
    label: 'Skandináv krimi',
    description: 'Lassú tempójú, atmoszférikus, esős/havas környezetben játszódik. A cselekmény a karakterek belső világára fókuszál. A feszültség lappangó, nem robbanó.',
    moodWords: 'borús, melankolikus, visszafogott, fagyos'
  },
  {
    label: 'Francia noir',
    description: 'Városias, cinikus, morálisan szürke zóna. Nincs egyértelmű jó és rossz, mindenki kompromittált. A párbeszédek élesek és szarkasztikusak.',
    moodWords: 'cinikus, füstös, urbánus, kétértelmű'
  },
  {
    label: 'Latin-amerikai realizmus',
    description: 'Érzéki, színes leírások, erős családi és közösségi szálak. A hatalom és korrupció mindennapossá válik. A humor és a tragédia keveredik.',
    moodWords: 'érzéki, forró, családi, fatalista'
  },
  {
    label: 'Brit irodalmi thriller',
    description: 'Kifinomult nyelvezet, társadalmi hierarchiák, osztálykülönbségek. A feszültség az udvariasság mögé rejtett fenyegetésekből fakad. Irónia és szubtilitás.',
    moodWords: 'elegáns, ironikus, réteges, visszafogott'
  },
  {
    label: 'Keleti-európai szatíra',
    description: 'Abszurd humor, bürokrácia mint labirintus, tragikomikus helyzetek. A szereplők az abszurd rendszerek ellen küzdenek, de maguk is a rendszer részei.',
    moodWords: 'abszurd, keserű, ironikus, groteszk'
  },
  {
    label: 'Japán pszichológiai thriller',
    description: 'Belső monológok, az őrület és a normalitás közti vékony határ. Apró, hétköznapi részletek válnak félelmetessé. A csend és az elhallgatás fontosabb mint a szavak.',
    moodWords: 'csendes, nyugtalanító, precíz, kísérteties'
  },
  {
    label: 'Amerikai investigatív',
    description: 'Nyomozó újságíró vagy kívülálló a főhős. Tempós, lendületes cselekmény, rövid fejezetek. A rendszer ellen küzd az egyén. Woodward & Bernstein öröksége.',
    moodWords: 'lendületes, makacs, aktuális, száraz'
  },
  {
    label: 'Orosz pszichológiai dráma',
    description: 'Mély lélektan, filozófiai kérdések, morális dilemmák. A bűn és bűnhődés kérdése. Hosszú belső monológok, a cselekvés tétovázásából fakadó feszültség.',
    moodWords: 'sötét, filozofikus, gyötrődő, mély'
  },
  {
    label: 'Mediterrán családi dráma',
    description: 'Családi titkok, generációs traumák, erős érzelmek. A tenger és a napsütés kontrasztja a sötét titkokkal. Az ételek, illatok és fizikai érintések fontosak.',
    moodWords: 'szenvedélyes, családi, meleg, titokzatos'
  },
  {
    label: 'Közép-európai politikai thriller',
    description: 'Rendszerváltás utáni atmoszféra, régi és új hatalmak összecsapása. Megfigyelés, besúgók, bizalmatlanság. Szürke erkölcsi zóna, ahol mindenki túlélő.',
    moodWords: 'szürke, klausztrofób, paranoiás, nosztalgiás'
  }
];

function getRandomStyle(): typeof NARRATIVE_STYLES[0] {
  return NARRATIVE_STYLES[Math.floor(Math.random() * NARRATIVE_STYLES.length)];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= FICTION SYSTEM PROMPT =============
const FICTION_SYSTEM_PROMPT = `Te egy bestseller könyvek szerzője és történetírás szakértő vagy. A felhasználó ad neked egy egyszerű sztori ötletet, és te ebből készítesz egy részletes, izgalmas történet vázlatot.

KÖVETELMÉNYEK:
1. **Izgalmas nyitás** - Hook ami azonnal megfogja az olvasót
2. **Komplex főszereplő** - Belső konfliktussal és karakterívvel
3. **Legalább 3-5 váratlan fordulat** - Meglepő, de logikus események
4. **Fokozódó feszültség** - Minden fejezet emelje a tétet
5. **Érzelmi mélység** - Karakterek akikkel azonosulni lehet
6. **Kielégító befejezés** - Meglepő de értelmes lezárás

BESTSELLER TECHNIKÁK:
- Háromlépcsős struktúra (setup, confrontation, resolution)
- "Save the Cat" beat-ek használata
- Show, don't tell elv
- Cliffhangerek a fejezetek végén
- Szub-plotok a főszereplő mellett

A VÁLASZOD KÖTELEZŐEN ÉRVÉNYES JSON FORMÁTUMBAN LEGYEN (és semmi más):
{
  "title": "Javasolt könyv cím",
  "logline": "Egy mondatos, hook-szerű összefoglaló (max 30 szó)",
  "synopsis": "3-5 bekezdéses részletes szinopszis a teljes történetről",
  "protagonist": {
    "name": "Főszereplő neve",
    "age": "Kor (opcionális)",
    "description": "Rövid leírás",
    "innerConflict": "Belső konfliktus amivel küzd",
    "arc": "Hogyan változik a történet végére"
  },
  "antagonist": {
    "name": "Ellenfél neve vagy a konfliktus forrása",
    "description": "Leírás és motiváció"
  },
  "setting": "Helyszín és időszak részletes leírása",
  "themes": ["Fő téma 1", "Fő téma 2", "Fő téma 3"],
  "plotPoints": [
    {"beat": "Opening Hook", "description": "A történet megragadó kezdése"},
    {"beat": "Inciting Incident", "description": "Az esemény ami elindítja a cselekményt"},
    {"beat": "First Plot Point", "description": "A főszereplő belép az új világba"},
    {"beat": "Rising Action", "description": "Kihívások és akadályok"},
    {"beat": "Midpoint Twist", "description": "Nagy fordulat a történet közepén"},
    {"beat": "Dark Night of Soul", "description": "A főszereplő legmélyebb pontja"},
    {"beat": "Climax", "description": "A végső összecsapás"},
    {"beat": "Resolution", "description": "A lezárás és új egyensúly"}
  ],
  "chapters": [
    {"number": 1, "title": "Fejezet címe", "summary": "Max 15 szavas összefoglaló"}
  ],
  "characters": [
    {
      "name": "Karakter teljes neve",
      "nickname": "Becenév vagy megszólítás (ha van, egyébként null)",
      "role": "protagonist | antagonist | supporting",
      "age": 30,
      "gender": "férfi | nő | egyéb",
      "occupation": "Foglalkozás",
      "appearance": "Részletes kinézet leírás (arc, testalkat, öltözködési stílus)",
      "hairColor": "Hajszín (fekete/barna/szoke/voros/oszes/feher/egyeb)",
      "eyeColor": "Szemszín (barna/kek/zold/szurke/mogyoro/egyeb)",
      "height": "Magasság szövegesen (pl. magas, alacsony, 178 cm)",
      "bodyType": "Testalkat (vekony/atletas/atlagos/telt/izmos)",
      "distinguishingFeatures": "Jellegzetes vonások (sebhely, tetoválás, járás, stb.)",
      "positiveTraits": ["pozitív vonás 1", "pozitív vonás 2", "pozitív vonás 3"],
      "negativeTraits": ["negatív vonás 1", "negatív vonás 2"],
      "fears": ["félelem 1", "félelem 2"],
      "backstory": "2-3 mondatos háttértörténet ami formálja a karaktert",
      "motivation": "Mi hajtja a karaktert",
      "speechStyle": "Hogyan beszél (pl. formális, szlenges, tömör, dadogós)",
      "characterVoice": "Részletes beszédstílus: szókincs szintje, kedvenc kifejezések, mondatszerkezet, érzelmi tónus",
      "keyEvents": [
        {"title": "Meghatározó esemény", "description": "Mi történt és hogyan hatott rá", "age": 15}
      ],
      "developmentArc": {
        "startState": "A karakter kiindulási állapota (érzelmi, mentális) a történet elején",
        "endState": "Hogyan változik a karakter a történet végére",
        "turningPoint": "A fordulópont ami a változást hozza",
        "growth": "pozitív | negatív | ambivalens"
      }
    }
  ]
}

FONTOS:
- Maximum 6-8 fejezetet javasolj RÖVID összefoglalókkal (max 10 szó/fejezet)
- Generálj legalább 3-5 karaktert TELJES adatlappal (MINDEN mezőt tölts ki, ne hagyj ki semmit!)
- A karakterek legyenek összetettek: pozitív ÉS negatív vonásokkal, félelmekkel, kulcseseményekkel
- Minden karakternek legyen legalább 1-2 keyEvents ami formálta a személyiségét
- A háttértörténetek legyenek részletesek (2-3 mondat, ne csak 1)
- A characterVoice legyen egyedi és megkülönböztethető minden karakternél
- A synopsis legyen tömör (max 3 bekezdés)
- Minden fejezet címe legyen kreatív és utaljon a tartalomra
- A válasz CSAK a JSON legyen, semmi más szöveg
- Magyar nyelven válaszolj`;

const EROTIC_ADDON = `

EROTIKUS TARTALOM IRÁNYELVEK:
- Az intim jelenetek legyenek a történet szerves részei
- Építsd az érzelmi és fizikai intimitást fokozatosan
- A karakterek közti kémia és vonzalom legyen hiteles
- Figyelj a beleegyezés és tisztelet ábrázolására
- Az explicit tartalom szolgálja a karakter-fejlődést`;

// ============= NONFICTION SYSTEM PROMPT =============
const NONFICTION_SYSTEM_PROMPT = `Te egy bestseller szakkönyvek ghostwritere vagy, aki a "Million Dollar Book Method" és Russell Brunson "DotComSecrets" stílusában ír.

A SZAKKÖNYV CÉLJA:
- Az olvasónak KONKRÉT, HASZNÁLHATÓ tudást adni
- Lépésről-lépésre útmutatót nyújtani
- Valós eredményeket és transzformációt ígérni

KÖTELEZŐ SZAKKÖNYV STRUKTÚRA:
1. NAGY ÍGÉRET - Konkrét, mérhető eredmény amit az olvasó elér (pl. "7 számjegyű bevétel", "100 ügyfél 90 nap alatt", "megszabadulsz a szorongástól")
2. CÉLKÖZÖNSÉG - Pontosan kinek szól és milyen problémával küzd
3. EGYEDI MÓDSZERTAN - Brandelhető keretrendszer/módszer neve és lényege (pl. "Bio-Logic Keretrendszer", "Revenue Blueprint")
4. FEJEZETEK - Logikus felépítés: Probléma → Módszer → Implementáció → Eredmények

STÍLUS SZABÁLYOK (KÖTELEZŐ):
- Első személy narratíva ("Én", "Az én tapasztalatom szerint...")
- Közvetlen megszólítás ("Te", "Neked", "Ha te is...")
- Rövid bekezdések (max 3-4 mondat)
- ZERO fluff - minden mondat értéket ad
- Konkrét számok, statisztikák, példák
- Személyes történetek a hitelesség érdekében

ABSZOLÚT TILTOTT ELEMEK (SOHA NE HASZNÁLD SZAKKÖNYVNÉL):
❌ Fiktív karakterek nevei (pl. "Mark Sullivan", "Elena Vance", "Julian Thorne")
❌ Regény-szerű cselekménypontok (Opening Hook, Climax, Resolution, Dark Night of Soul)
❌ Antagonista vagy konfliktus karakter
❌ "Helyszín és időszak" szekció
❌ Karakterív vagy belső konfliktus
❌ Szinopszis fiktív történettel
❌ Bármilyen regény/fikció elem

A VÁLASZOD KÖTELEZŐEN ÉRVÉNYES JSON FORMÁTUMBAN LEGYEN:
{
  "title": "Könyv címe a nagy ígérettel",
  "promise": "A konkrét eredmény amit az olvasó elér - egy erős mondat (pl. 'Megtanulod, hogyan építs 7 számjegyű online vállalkozást 12 hónap alatt a bizonyított Revenue Blueprint módszerrel.')",
  "targetReader": "Pontosan kinek szól: [célközönség] akik [probléma/kihívás] és szeretnék [vágyott eredmény]",
  "methodology": {
    "name": "A módszertan/keretrendszer brandelhető neve (pl. 'A 90 Napos Áttörés Rendszer')",
    "description": "A módszer lényege 2-3 mondatban - mit csinál és miért működik",
    "keySteps": ["1. lépés rövid leírása", "2. lépés rövid leírása", "3. lépés rövid leírása", "4. lépés rövid leírása"]
  },
  "chapters": [
    {"number": 1, "title": "Bevezetés: Az Ígéret", "summary": "Mit fog elérni az olvasó és miért működik ez a módszer"},
    {"number": 2, "title": "A Probléma Gyökere", "summary": "Miért nem működnek a hagyományos megközelítések"},
    {"number": 3, "title": "A [Módszer Neve] Alapjai", "summary": "A keretrendszer bemutatása és alapelvei"},
    {"number": 4, "title": "Implementáció", "summary": "Lépésről-lépésre útmutató a gyakorlati alkalmazáshoz"},
    {"number": 5, "title": "Záró Gondolatok", "summary": "Összefoglalás és következő lépések"}
  ],
  "authorCredibility": "Miért higgyenek neked - rövid szerzői hitelesség (opcionális, max 2 mondat)",
  "callToAction": "Mit tegyen az olvasó a könyv elolvasása után - konkrét első lépés"
}

FONTOS:
- 5-8 fejezet, logikus szakkönyv felépítéssel
- Minden fejezet TUDÁST és MEGOLDÁST nyújtson, NE történetet
- A válasz CSAK a JSON legyen, semmi más szöveg
- Magyar nyelven válaszolj
- NE generálj karaktereket, antagonistát, vagy cselekménypontokat!`;

// ============= INVESTIGATIVE SYSTEM PROMPT =============
const INVESTIGATIVE_SYSTEM_PROMPT = `Te egy díjnyertes oknyomozó újságíró és könyvíró vagy. Dokumentumfilm-szerű, tényalapú könyveket írsz, ahol az oknyomozó végigvezeti az olvasót egy valós ügy feltárásán bizonyítékokkal, dokumentumokkal és kronologikus feltárással.

OKNYOMOZÓ KÖNYV JELLEMZŐI:
- HIBRID MŰFAJ: Tényalapú szakkönyv + fikciós feszültségépítési technikák
- Az OKNYOMOZÓ a főszereplő/narrátor aki végigvezet az igaz történeten
- Minden állítás BIZONYÍTÉKOKKAL van alátámasztva (dokumentumok, dátumok, nevek, számok)
- "Követsd a pénzt" / "Követsd a szálakat" logika
- Kronologikus feltárás — az olvasó az oknyomozóval együtt fedezi fel az igazságot

KÖTELEZŐ STRUKTÚRA:
1. HOOK: Egy drámai jelenet a sztori közepéből — azonnal belerángatja az olvasót
2. HÁTTÉR: A téma kontextusa, miért fontos, kik az érintettek
3. NYOMOZÁS: Kronologikus feltárás bizonyítékokkal — a könyv gerince
4. FORDULÓPONTOK: Áttörések, leleplezések, "aha pillanatok"
5. KÖVETKEZMÉNYEK: Mi lett a végeredmény, mi változott
6. TANULSÁGOK: Miért fontos az olvasónak, mit tanulhatunk belőle

STÍLUS SZABÁLYOK:
- "Show, don't tell" — jeleneteket ír, nem összefoglal
- Feszültségépítés: minden fejezet végén cliffhanger vagy új kérdés
- Bizonyítékok inline bemutatása (dátumok, dokumentum-részletek, idézetek)
- Az oknyomozó mint narrátor/guide — személyes reflexiók a feltárás közben
- Konkrét nevek, dátumok, helyszínek, összegek ahol releváns
- NE használj fiktív karakterneveket — vagy valós neveket, vagy szerepleírásokat ("a miniszter", "a bennfentes")

A VÁLASZOD KÖTELEZŐEN ÉRVÉNYES JSON FORMÁTUMBAN LEGYEN:
{
  "title": "Könyv címe — drámai, figyelemfelkeltő",
  "centralQuestion": "A fő kérdés amire a könyv válaszol (pl. 'Hogyan épült ki a rendszer és miért omlott össze?')",
  "subject": "Az ügy/vizsgálat tárgya röviden",
  "timeline": "A vizsgált időszak (pl. '2010-2024')",
  "keyPlayers": ["Szereplő 1 — szerepe", "Szereplő 2 — szerepe", "Szereplő 3 — szerepe"],
  "evidenceMap": "Milyen típusú bizonyítékokra épül a könyv (dokumentumok, interjúk, pénzügyi adatok, stb.)",
  "promise": "Mit fog megtudni az olvasó amit eddig nem tudott",
  "chapters": [
    {"number": 1, "title": "Prológus: [Drámai nyitójelenet]", "summary": "Hook — egy jelenet az ügy közepéből ami azonnal megfogja az olvasót"},
    {"number": 2, "title": "A Háttér", "summary": "Kontextus, a szereplők bemutatása, miért fontos az ügy"},
    {"number": 3, "title": "Az Első Szálak", "summary": "A nyomozás kezdete, első bizonyítékok"},
    {"number": 4, "title": "Követsd a Pénzt", "summary": "Pénzügyi szálak, dokumentumok feltárása"},
    {"number": 5, "title": "A Fordulópont", "summary": "Áttörés — a kulcsbizonyíték ami mindent megváltoztat"},
    {"number": 6, "title": "A Leleplezés", "summary": "A teljes kép összeáll"},
    {"number": 7, "title": "Következmények", "summary": "Mi történt azóta, mi változott"},
    {"number": 8, "title": "Tanulságok", "summary": "Miért fontos ez nekünk, mit tehetünk"}
  ],
  "investigatorRole": "Az oknyomozó szerepe (első/harmadik személy)",
  "callToAction": "Mit tegyen az olvasó a könyv után"
}

FONTOS:
- 6-10 fejezet, kronologikus feltárás ívével
- Minden fejezet egy-egy "epizód" a nyomozásban
- A válasz CSAK a JSON legyen, semmi más szöveg
- Magyar nyelven válaszolj
- NE generálj fiktív karaktereket vagy regény cselekménypontokat!`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Nincs jogosultság" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen vagy lejárt token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${userData.user.id}`);
    // ========== END AUTHENTICATION CHECK ==========

    const { storyIdea, genre, tone, targetAudience, authorProfile, nonfictionBookType } = await req.json();

    if (!storyIdea || storyIdea.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Kérlek adj meg egy részletesebb sztori ötletet (legalább 10 karakter)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI szolgáltatás nincs konfigurálva" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch AI generation settings
    const aiSettings = await getAISettings(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

    // Determine if this is a nonfiction book (handle both accented and unaccented versions)
    const isNonfiction = genre === "szakkonyv" || genre === "szakkönyv";

    // Check for investigative book type
    const isInvestigative = isNonfiction && nonfictionBookType === "investigative";

    // Build the system prompt based on genre
    let systemPrompt: string;
    if (isInvestigative) {
      systemPrompt = INVESTIGATIVE_SYSTEM_PROMPT;
    } else if (isNonfiction) {
      systemPrompt = NONFICTION_SYSTEM_PROMPT;
    } else if (genre === "erotikus") {
      systemPrompt = FICTION_SYSTEM_PROMPT + EROTIC_ADDON;
    } else {
      systemPrompt = FICTION_SYSTEM_PROMPT;
    }

    // Build context for the prompt
    const contextParts: string[] = [];
    if (genre && !isNonfiction) {
      const genreNames: Record<string, string> = {
        fiction: "Szépirodalmi regény",
        erotikus: "Erotikus regény",
        thriller: "Thriller",
        krimi: "Krimi",
        romantikus: "Romantikus regény",
        scifi: "Sci-Fi",
        fantasy: "Fantasy",
        horror: "Horror",
        drama: "Dráma",
        kaland: "Kaland",
        tortenelmi: "Történelmi regény"
      };
      contextParts.push(`Műfaj: ${genreNames[genre] || genre}`);
    }
    
    if (tone) {
      const toneNames: Record<string, string> = {
        formal: "Formális",
        direct: "Közvetlen",
        friendly: "Barátságos",
        provocative: "Provokatív",
        light: "Könnyed",
        professional: "Professzionális",
        dramatic: "Drámai",
        humorous: "Humoros",
        dark: "Sötét",
        suspenseful: "Feszült",
        inspiring: "Inspiráló"
      };
      contextParts.push(`Hangnem: ${toneNames[tone] || tone}`);
    }
    
    if (targetAudience) {
      contextParts.push(`Célközönség: ${targetAudience}`);
    }

    // Add author profile context for nonfiction
    let authorContext = "";
    if (isNonfiction && authorProfile) {
      const formality = authorProfile.formality === "tegez" ? "tegezés (közvetlen)" : "magázás (formális)";
      authorContext = `
SZERZŐ PROFIL (használd ezt a koncepció személyre szabásához):
- Szerző neve: ${authorProfile.authorName || "Nincs megadva"}
- Megszólítás stílusa: ${formality}
- Háttér és szakértelem: ${authorProfile.authorBackground || "Nincs megadva"}
- Személyes történetek: ${authorProfile.personalStories || "Nincs megadva"}
- Fő ígéret az olvasóknak: ${authorProfile.mainPromise || "Nincs megadva"}
`;
    }

    // Build user prompt based on book type
    let userPrompt: string;
    if (isNonfiction) {
      userPrompt = `${contextParts.length > 0 ? contextParts.join("\n") + "\n\n" : ""}${authorContext}
KÖNYV ÖTLET/TÉMA:
${storyIdea}

Készíts ebből egy professzionális SZAKKÖNYV koncepciót a megadott JSON formátumban!
FONTOS: Ez egy SZAKKÖNYV, NEM regény! Ne használj fiktív karaktereket, antagonistát, vagy regény cselekménypontokat!`;
    } else {
      const randomNames = getRandomNames(6);
      const nameContext = `
KARAKTER NEVEK (HASZNÁLD EZEKET, NE TALÁLJ KI SAJÁTOT!):
Férfi nevek (válassz ezek közül): ${randomNames.male.join(', ')}
Női nevek (válassz ezek közül): ${randomNames.female.join(', ')}

TILOS az alábbi neveket használni (túl gyakori AI-generált nevek):
- Kovács Ádám, Kovács János, Nagy Péter, Szabó István
- Varga Endre, Tarján Viktor, Dr. Varga
- Bármilyen "Kovács", "Nagy", "Szabó" vezetéknevű karakter

A nevek legyenek VÁLTOZATOSAK és EGYEDIEK!`;

      const randomStyle = getRandomStyle();
      const styleContext = `
NARRATÍV STÍLUS IRÁNYELV (kövesd ezt az atmoszférát és hangvételt!):
Stílus: ${randomStyle.label}
Leírás: ${randomStyle.description}
Hangulati kulcsszavak: ${randomStyle.moodWords}

FONTOS: Ez a stílus az ATMOSZFÉRÁT és HANGVÉTELT határozza meg, NEM a helyszínt! A történet továbbra is a felhasználó által megadott témáról szóljon, de a FELDOLGOZÁS módja kövesse a fenti stílust.`;

      userPrompt = `${contextParts.length > 0 ? contextParts.join("\n") + "\n\n" : ""}${nameContext}
${styleContext}

SZTORI ÖTLET:
${storyIdea}

Készíts ebből egy részletes, bestseller-minőségű történet vázlatot a megadott JSON formátumban!`;

      // Store selected style for later use in writing
      (globalThis as Record<string, unknown>).__selectedNarrativeStyle = { label: randomStyle.label, moodWords: randomStyle.moodWords };
    }

    // Retry logic exponenciális backoff-al (429/502/503 kezelés)
    const maxRetries = 7;
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55000);

        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            max_tokens: 8000,
            temperature: aiSettings.temperature,
            frequency_penalty: aiSettings.frequency_penalty,
            presence_penalty: aiSettings.presence_penalty,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429 || response.status === 502 || response.status === 503 || response.status === 529) {
          const statusText = response.status === 429 ? "Rate limit" : `Gateway ${response.status}`;
          console.error(`${statusText} (attempt ${attempt}/${maxRetries})`);
          
          if (attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            console.log(`Waiting ${delay/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        break;
      } catch (fetchError) {
        lastError = fetchError as Error;
        if ((fetchError as Error).name === "AbortError") {
          console.error(`Timeout (attempt ${attempt}/${maxRetries})`);
        } else {
          console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
        }
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    if (!response) {
      return new Response(
        JSON.stringify({ error: lastError?.message || "A generálás túl sokáig tartott. Próbáld újra rövidebb ötlettel." }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Túl sok kérés. Kérlek várj egy kicsit és próbáld újra." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Nincs elég kredit. Kérlek töltsd fel az egyenleged." }),
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

    // Use response.text() for more stable body reading
    let rawText: string;
    try {
      rawText = await response.text();
      console.log("Raw response length:", rawText.length);
    } catch (bodyError) {
      console.error("Body read error:", bodyError);
      return new Response(
        JSON.stringify({ error: "A válasz olvasása sikertelen. Próbáld újra." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Gateway response parse error:", parseError, "Raw:", rawText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Hibás válasz az AI szolgáltatástól. Próbáld újra." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Nem sikerült választ generálni" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the response
    // Sometimes the AI wraps it in markdown code blocks
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    // Fix common JSON issues from AI responses
    // Remove trailing commas before closing brackets/braces
    jsonContent = jsonContent.replace(/,(\s*[\]}])/g, '$1');
    // Remove any control characters that might cause issues
    jsonContent = jsonContent.replace(/[\x00-\x1F\x7F]/g, (char: string) => {
      if (char === '\n' || char === '\r' || char === '\t') return char;
      return '';
    });

    // Truncated JSON repair: if JSON doesn't end properly, try to close it
    if (!jsonContent.trim().endsWith('}')) {
      console.log("Detected truncated JSON, attempting repair...");
      
      // Find the last complete JSON object (ending with "}")
      const lastCompleteObj = jsonContent.lastIndexOf('"}');
      if (lastCompleteObj > 0) {
        jsonContent = jsonContent.substring(0, lastCompleteObj + 2);
        
        // Balance brackets and braces
        const openBrackets = (jsonContent.match(/\[/g) || []).length;
        const closeBrackets = (jsonContent.match(/\]/g) || []).length;
        const openBraces = (jsonContent.match(/\{/g) || []).length;
        const closeBraces = (jsonContent.match(/\}/g) || []).length;
        
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          jsonContent += ']';
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          jsonContent += '}';
        }
        
        // Remove trailing commas that may have been left
        jsonContent = jsonContent.replace(/,(\s*[\]}])/g, '$1');
      }
    }

    let storyData;
    try {
      storyData = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", jsonContent.substring(0, 500));
      
      // Try to extract just the essential data if JSON is malformed
      try {
        // Attempt to find and parse a valid JSON object
        const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let cleanedJson = jsonMatch[0].replace(/,(\s*[\]}])/g, '$1');
          
          // Additional repair: ensure proper closing
          const openBraces = (cleanedJson.match(/\{/g) || []).length;
          const closeBraces = (cleanedJson.match(/\}/g) || []).length;
          const openBrackets = (cleanedJson.match(/\[/g) || []).length;
          const closeBrackets = (cleanedJson.match(/\]/g) || []).length;
          
          // Add missing closing brackets/braces
          for (let i = 0; i < openBrackets - closeBrackets; i++) {
            cleanedJson += ']';
          }
          for (let i = 0; i < openBraces - closeBraces; i++) {
            cleanedJson += '}';
          }
          
          storyData = JSON.parse(cleanedJson);
        } else {
          throw new Error("No JSON object found");
        }
      } catch (retryError) {
        console.error("JSON retry parse error:", retryError);
        return new Response(
          JSON.stringify({ error: "Nem sikerült feldolgozni a generált koncepciót. Próbáld újra." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate required fields based on book type
    if (isNonfiction) {
      // Nonfiction validation
      if (!storyData.title || !storyData.promise || !storyData.chapters) {
        return new Response(
          JSON.stringify({ error: "Hiányos szakkönyv koncepció. Próbáld újra." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // FORCE CHECK: If fiction elements are present in nonfiction, reject and ask for retry
      if (storyData.protagonist || storyData.antagonist || storyData.plotPoints || storyData.synopsis) {
        console.error("FICTION ELEMENTS DETECTED IN NONFICTION RESPONSE - forcing regeneration");
        return new Response(
          JSON.stringify({ error: "Hibás formátum generálva. Kérlek próbáld újra." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Add a flag to indicate this is nonfiction for frontend handling
      storyData._type = "nonfiction";
    } else {
      // Fiction validation
      if (!storyData.title || !storyData.synopsis || !storyData.chapters) {
        return new Response(
          JSON.stringify({ error: "Hiányos sztori generálás. Próbáld újra." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      storyData._type = "fiction";
      // Attach narrative style seed to story data
      const selectedStyle = (globalThis as Record<string, unknown>).__selectedNarrativeStyle;
      if (selectedStyle) {
        storyData.narrative_style = selectedStyle;
      }
    }

    return new Response(
      JSON.stringify(storyData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate story error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
