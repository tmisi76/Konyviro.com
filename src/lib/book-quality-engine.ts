// Book Quality Engine - Central module for professional book generation

// ==================== TYPE DEFINITIONS ====================

export type BookType = "regeny" | "szakmai" | "onfejleszto";
export type FictionStyle = "irodalmi" | "kortars" | "thriller" | "romantikus";
export type NonfictionStyle = "akademiai" | "gyakorlatias" | "coach" | "storytelling";
export type WritingStyle = FictionStyle | NonfictionStyle;
export type AudienceLevel = "kezdo" | "kozepes" | "halado" | "szakerto";
export type TensionLevel = "low" | "rising" | "medium" | "high" | "climax" | "falling";

export interface StoryArc {
  act1EndChapter: number;
  midpointChapter: number;
  act2EndChapter: number;
  climaxChapter: number;
  totalChapters: number;
}

export interface CharacterDevelopmentArc {
  startingState: string;
  wound: string;
  want: string;
  need: string;
  transformation: string;
}

export interface QualityIssue {
  type: "repetition" | "cliche" | "telling" | "pacing" | "consistency" | "sensory" | "dialogue";
  severity: "low" | "medium" | "high";
  location: string;
  description: string;
  suggestion: string;
}

export interface QualityReport {
  overallScore: number;
  breakdown: {
    sensoryDetails: number;
    sentenceVariety: number;
    dialogueUniqueness: number;
    showDontTell: number;
    repetitionScore: number;
    pacingScore: number;
  };
  issues: QualityIssue[];
  suggestions: string[];
}

export interface QualityConfig {
  bookType: BookType;
  writingStyle: WritingStyle;
  targetAudience: AudienceLevel;
  storyArc?: StoryArc;
}

// ==================== CONSTANTS ====================

export const BOOK_TYPE_LABELS: Record<BookType, string> = {
  regeny: "Regény",
  szakmai: "Szakmai könyv",
  onfejleszto: "Önfejlesztő könyv",
};

export const FICTION_STYLE_OPTIONS: { id: FictionStyle; label: string; description: string }[] = [
  { id: "irodalmi", label: "Irodalmi", description: "Komplex nyelvezet, mély karakterábrázolás, metaforikus stílus" },
  { id: "kortars", label: "Kortárs", description: "Modern, közvetlen stílus, gyors tempó, könnyű olvashatóság" },
  { id: "thriller", label: "Thriller", description: "Feszült, rövid fejezetek, cliffhangerek, akcióközpontú" },
  { id: "romantikus", label: "Romantikus", description: "Érzelmes, leíró, kapcsolat-fókuszú, hangulatos" },
];

export const NONFICTION_STYLE_OPTIONS: { id: NonfictionStyle; label: string; description: string }[] = [
  { id: "akademiai", label: "Akadémiai", description: "Formális nyelvezet, hivatkozásokkal, strukturált érvelés" },
  { id: "gyakorlatias", label: "Gyakorlatias", description: "Lépésről lépésre útmutató, konkrét példákkal" },
  { id: "coach", label: "Coach stílus", description: "Motiváló, személyes hangvétel, kérdések az olvasónak" },
  { id: "storytelling", label: "Storytelling", description: "Történeteken keresztül tanít, esettanulmányok" },
];

export const AUDIENCE_LEVEL_OPTIONS: { id: AudienceLevel; label: string; description: string }[] = [
  { id: "kezdo", label: "Kezdő", description: "Egyszerű nyelvezet, alapfogalmak magyarázata" },
  { id: "kozepes", label: "Közepes", description: "Átlagos komplexitás, kiegyensúlyozott" },
  { id: "halado", label: "Haladó", description: "Összetettebb fogalmak, kevesebb magyarázat" },
  { id: "szakerto", label: "Szakértő", description: "Magas szintű, szakzsargon használata" },
];

// ==================== DRAMATURGICAL ARC ====================

/**
 * Calculate the default story arc based on total chapters
 */
export function calculateDefaultStoryArc(totalChapters: number): StoryArc {
  return {
    act1EndChapter: Math.max(1, Math.floor(totalChapters * 0.25)),
    midpointChapter: Math.max(2, Math.floor(totalChapters * 0.5)),
    act2EndChapter: Math.max(3, Math.floor(totalChapters * 0.75)),
    climaxChapter: Math.max(4, Math.floor(totalChapters * 0.9)),
    totalChapters,
  };
}

/**
 * Get the tension level for a specific chapter based on the story arc
 */
export function getTensionLevel(chapterNumber: number, storyArc: StoryArc): TensionLevel {
  const { act1EndChapter, midpointChapter, act2EndChapter, climaxChapter, totalChapters } = storyArc;

  // Opening - establish world and characters
  if (chapterNumber <= 2) {
    return "low";
  }

  // Rising action in Act 1
  if (chapterNumber <= act1EndChapter) {
    return "rising";
  }

  // First half of Act 2 - building towards midpoint
  if (chapterNumber < midpointChapter) {
    return "medium";
  }

  // Midpoint - major revelation or shift
  if (chapterNumber === midpointChapter) {
    return "high";
  }

  // Second half of Act 2 - complications increase
  if (chapterNumber <= act2EndChapter) {
    return "rising";
  }

  // Act 3 - climax
  if (chapterNumber === climaxChapter) {
    return "climax";
  }

  // Resolution
  if (chapterNumber > climaxChapter) {
    return "falling";
  }

  return "medium";
}

/**
 * Get descriptive text for tension level (Hungarian)
 */
export function getTensionDescription(level: TensionLevel): string {
  const descriptions: Record<TensionLevel, string> = {
    low: "Lassú tempó, atmoszféra-építés, karakterbemutatkozás",
    rising: "Növekvő feszültség, konfliktusok kibontakozása",
    medium: "Kiegyensúlyozott tempó, cselekmény fejlődése",
    high: "Magas feszültség, fontos fordulópontok",
    climax: "Csúcspont, maximális feszültség, döntő események",
    falling: "Csökkenő feszültség, megoldás, lezárás",
  };
  return descriptions[level];
}

// ==================== STYLE PROMPTS ====================

/**
 * Generate fiction style-specific prompt additions
 */
export function getFictionStylePrompt(style: FictionStyle): string {
  const prompts: Record<FictionStyle, string> = {
    irodalmi: `
## IRODALMI STÍLUS:
- Használj komplex mondatszerkezeteket és gazdag szókincset
- Alkalmazz metaforákat és szimbólumokat a mélyebb jelentésrétegekért
- Fókuszálj a belső monológokra és a karakterek pszichológiai mélységére
- Kerüld a könnyű megoldásokat - a konfliktusok legyenek árnyaltak
- A leírások legyenek költőiek, de ne öncélúak
- Engedd, hogy a csend és a ki nem mondott dolgok is beszéljenek`,

    kortars: `
## KORTÁRS STÍLUS:
- Használj közvetlen, modern nyelvezetet - ahogy ma beszélünk
- Gyors váltások a jelenetek között
- Dialógusközpontú történetvezetés
- Kerüld a hosszú leírásokat - tömör, lényegre törő fogalmazás
- Pop-kulturális utalások ahol illeszkednek
- Rövid bekezdések, dinamikus ritmus`,

    thriller: `
## THRILLER STÍLUS:
- Minden fejezet végén cliffhanger vagy új kérdés
- Rövid, pattogó mondatok a feszült pillanatokban
- Időnyomás érzékeltetése (órák, percek említése)
- Váratlan fordulatok és csavarok
- Akció-reakció gyors váltakozása
- Korlátozd az információt - az olvasó ne tudjon mindent
- "Ticking clock" technika alkalmazása`,

    romantikus: `
## ROMANTIKUS STÍLUS:
- Részletes érzelmi állapotok bemutatása
- Érzéki leírások (illatok, textúrák, hangok)
- Lassú építkezés a kapcsolatban
- Belső monológok az érzelmekről
- Hangulatos helyszínleírások
- Feszültség a szereplők között (push-pull dinamika)
- Intim pillanatok részletes kidolgozása`,
  };

  return prompts[style];
}

/**
 * Generate nonfiction style-specific prompt additions
 */
export function getNonfictionStylePrompt(style: NonfictionStyle): string {
  const prompts: Record<NonfictionStyle, string> = {
    akademiai: `
## AKADÉMIAI STÍLUS:
- Formális, objektív hangvétel
- Precíz szakkifejezések használata definíciókkal
- Hivatkozási lehetőségek jelölése: [FORRÁS: téma]
- Logikus érvelési struktúra
- Tézis → bizonyítékok → konklúzió felépítés
- Ellenérvek bemutatása és cáfolata
- Táblázatok és összefoglalók használata`,

    gyakorlatias: `
## GYAKORLATIAS STÍLUS:
- Lépésről lépésre útmutatók számozott listákkal
- "Hogyan csináld" fokusz minden szekcióban
- Konkrét példák és számok
- Ellenőrző listák (checklistek)
- Gyakori hibák és megoldásuk
- Képernyőképek/diagramok helyei: [ÁBRA: leírás]
- "Pro tipp" dobozok gyakorlott felhasználóknak`,

    coach: `
## COACH STÍLUS:
- Személyes, motiváló hangvétel
- Közvetlen megszólítás (Te-forma)
- Kérdések az olvasónak: "Mi tart vissza attól, hogy...?"
- Pozitív megerősítések és bátorítás
- Személyes történetek és kudarcok megosztása
- Affirmációk és mantrák
- Reflexiós feladatok és naplózási gyakorlatok`,

    storytelling: `
## STORYTELLING STÍLUS:
- Minden koncepció egy történettel kezdődik
- Esettanulmányok valós személyekről (álnevek)
- "Képzeld el..." típusú bevezető mondatok
- Hős-utazás struktúra a fejezeten belül
- Érzelmi kapcsolódási pontok
- Konfliktus → küzdelem → megoldás íven keresztül tanít
- Az olvasó azonosulhasson a szereplőkkel`,
  };

  return prompts[style];
}

/**
 * Generate audience level specific prompt additions
 */
export function getAudienceLevelPrompt(level: AudienceLevel): string {
  const prompts: Record<AudienceLevel, string> = {
    kezdo: `
## CÉLKÖZÖNSÉG: KEZDŐ
- Minden szakkifejezést magyarázz meg első használatkor
- Egyszerű mondatok, kerüld a bonyolult szerkezeteket
- Hétköznapi analógiák használata
- Több példa, kevesebb absztrakt elmélet
- Apró lépésekben haladj
- Összefoglalások minden szekció végén`,

    kozepes: `
## CÉLKÖZÖNSÉG: KÖZEPES
- Kiegyensúlyozott komplexitás
- Az alapfogalmakat feltételezd ismertnek
- Átlagos mondathosszúság
- Mix: elmélet és gyakorlat egyensúlyban
- Alkalmanként kihívást jelentő tartalom`,

    halado: `
## CÉLKÖZÖNSÉG: HALADÓ
- Magasabb szintű koncepciók gyorsabb bevezetése
- Szakkifejezések magyarázat nélkül használhatók
- Összetettebb példák és esettanulmányok
- Árnyaltabb elemzések
- Haladó technikák és optimalizációk`,

    szakerto: `
## CÉLKÖZÖNSÉG: SZAKÉRTŐ
- Szakzsargon szabadon használható
- Mélyreható technikai részletek
- Edge case-ek és speciális helyzetek
- Kutatási eredmények és legújabb trendek
- Kritikai elemzés és viták
- Hivatkozások más szakértőkre`,
  };

  return prompts[level];
}

// ==================== TENSION-BASED PROMPTS ====================

/**
 * Generate tension-aware prompt additions for fiction
 */
export function getTensionPrompt(level: TensionLevel): string {
  const prompts: Record<TensionLevel, string> = {
    low: `
## JELENLEGI FESZÜLTSÉGSZINT: ALACSONY
STÍLUS INSTRUKCIÓK:
- Lassú, leíró tempó - adj teret az atmoszférának
- Hosszabb mondatok, részletes környezetleírás
- Karakterbemutatkozás természetes párbeszédeken keresztül
- Érzékszervi részletek: szagok, hangok, textúrák
- A konfliktus még csak csírájában - apró jelzések
- Ne siettess - hagyd, hogy az olvasó megismerje a világot`,

    rising: `
## JELENLEGI FESZÜLTSÉGSZINT: EMELKEDŐ
STÍLUS INSTRUKCIÓK:
- Fokozatosan gyorsuló tempó
- Váltakozó mondathossz - néha rövid, csattanós
- Konfliktusok kezdenek kiéleződni
- Karakterek döntések elé kerülnek
- Feszültség a párbeszédekben - ki nem mondott dolgok
- Apró akadályok és komplikációk`,

    medium: `
## JELENLEGI FESZÜLTSÉGSZINT: KÖZEPES
STÍLUS INSTRUKCIÓK:
- Kiegyensúlyozott tempó
- Cselekmény és karakterfejlődés egyensúlyban
- Fordulópontok előkészítése
- Érzelmi tét emelése
- Sub-plotok kibontakozása`,

    high: `
## JELENLEGI FESZÜLTSÉGSZINT: MAGAS
STÍLUS INSTRUKCIÓK:
- Gyors tempó, rövidebb bekezdések
- Drámai fordulópont vagy leleplezés
- Intenzív érzelmek
- Rövid, hatásos mondatok váltakozva hosszabbakkal
- Cliffhanger vagy sokkhatás a végén
- Az olvasó ne tudja letenni`,

    climax: `
## JELENLEGI FESZÜLTSÉGSZINT: CSÚCSPONT
STÍLUS INSTRUKCIÓK:
- MAXIMÁLIS INTENZITÁS
- Rövid, pattogó mondatok dominálnak
- Minden szó számít - nincs töltelék
- Döntő összecsapás vagy konfrontáció
- A főhős legnagyobb próbatétele
- Élet-halál tét (szó szerint vagy metaforikusan)
- Katartikus pillanat`,

    falling: `
## JELENLEGI FESZÜLTSÉGSZINT: LECSENGŐ
STÍLUS INSTRUKCIÓK:
- Lassabb, nyugodtabb tempó
- Érzelmi feldolgozás ideje
- A konfliktus következményei
- Karakterek új egyensúlyt találnak
- Nyitott szálak lezárása
- Reményteli vagy melankolikus hangulat
- Tükröződés az elejére - keretezés`,
  };

  return prompts[level];
}

// ==================== QUALITY ANALYSIS ====================

/**
 * Common clichés to detect and avoid (Hungarian)
 */
export const COMMON_CLICHES = [
  "kristálytiszta",
  "villámgyorsan",
  "halálra rémült",
  "pokoli fájdalom",
  "angyali mosoly",
  "sötét múlt",
  "könnyekig meghatódott",
  "ördögi terv",
  "szíve szerint",
  "lélegzet-elállító",
  "mennydörgő csend",
  "dermesztő hideg",
  "égő vágy",
  "halálos csend",
  "tökéletes pillanat",
  "végzetes hiba",
  "sorsfordító döntés",
  "lángoló szenvedély",
  "jéghideg tekintet",
  "forró könnycseppek",
];

/**
 * "Telling" words that should be replaced with "showing"
 */
export const TELLING_WORDS = [
  "érezte",
  "gondolta",
  "tudta",
  "rájött",
  "megértette",
  "döbbenten",
  "boldogan",
  "szomorúan",
  "dühösen",
  "izgatottan",
  "aggódva",
  "félve",
  "örömmel",
];

/**
 * Build the complete style prompt for a chapter/scene
 */
export function buildCompleteStylePrompt(config: {
  bookType: BookType;
  writingStyle?: WritingStyle;
  audienceLevel?: AudienceLevel;
  tensionLevel?: TensionLevel;
  chapterNumber?: number;
  totalChapters?: number;
}): string {
  const parts: string[] = [];

  // Book type specific base
  if (config.bookType === "regeny" && config.writingStyle) {
    parts.push(getFictionStylePrompt(config.writingStyle as FictionStyle));
  } else if ((config.bookType === "szakmai" || config.bookType === "onfejleszto") && config.writingStyle) {
    parts.push(getNonfictionStylePrompt(config.writingStyle as NonfictionStyle));
  }

  // Audience level
  if (config.audienceLevel) {
    parts.push(getAudienceLevelPrompt(config.audienceLevel));
  }

  // Tension level (for fiction)
  if (config.bookType === "regeny" && config.tensionLevel) {
    parts.push(getTensionPrompt(config.tensionLevel));
  }

  // Chapter position context
  if (config.chapterNumber && config.totalChapters) {
    const position = config.chapterNumber / config.totalChapters;
    if (position <= 0.1) {
      parts.push("\n## FEJEZET POZÍCIÓ: NYITÁNY\nEz az első benyomás - ragadd meg az olvasót azonnal!");
    } else if (position >= 0.9) {
      parts.push("\n## FEJEZET POZÍCIÓ: FINÁLÉ\nZárd le a szálakat, adj katarzist az olvasónak.");
    }
  }

  return parts.join("\n\n");
}

// ==================== ADVANCED FICTION RULES ====================

export const ADVANCED_FICTION_RULES = `
## ÉRZÉKSZERVI ÍRÁS (KÖTELEZŐ):
- Minden jelenetben legalább 3 érzékszervre utalj:
  • LÁTÁS: színek, fények, árnyékok, mozgás
  • HALLÁS: zajok, hangok, csend, ritmus
  • SZAGLÁS: illatok, bűzök, aromák
  • TAPINTÁS: textúrák, hőmérséklet, fájdalom
  • ÍZLELÉS: ha releváns (étkezés, csók, vér)
- Használj szinesztéziát: "A csend súlyos volt, mint az ólom"
- Kerüld a filter-szavakat (látta, hallotta) - írd közvetlenül:
  ❌ "Látta, hogy esik az eső"
  ✅ "Az eső cseppjei ritmikusan kopogtak az ablakon"

## MONDATRITMUS (KÖTELEZŐ):
- Váltogasd a mondathosszt tudatosan:
  • Feszült pillanat: "Megállt. Hallgatózott. Semmi."
  • Leíró rész: "A nap utolsó sugarai aranyló fénybe vonták a völgyet, ahol a régi malom állt, rozsdás lapátjait mozdulatlanul tartva a hűvös esti szélben."
- Bekezdés-ritmus: ne legyen minden bekezdés egyforma hosszú

## PÁRBESZÉD EGYEDISÉG (KÖTELEZŐ):
Minden karakternek saját hangja legyen:
- Szókincs: ki beszél irodalmian, ki egyszerűen?
- Mondathossz: ki beszél röviden, ki csapong?
- Szokások: közbevág? kérdez? parancsol?
- Tájszólás vagy akcentus jelzése (ha van)

KERÜLENDŐ:
- Minden karakter ugyanúgy beszél
- "Mondta", "válaszolta" túlhasználata - használj cselekvést
  ❌ "Mennem kell" - mondta idegesem.
  ✅ "Mennem kell." Az asztalt bökte, miközben felállt.

## KLISÉ-KERÜLÉS:
Tilos használni (vagy írj rájuk új variációt):
- "kristálytiszta", "villámgyorsan", "halálra rémült"
- "pokoli fájdalom", "angyali mosoly", "sötét múlt"
- "sorsfordító döntés", "lángoló szenvedély"

## SHOW, DON'T TELL (KÖTELEZŐ):
❌ TELLING: "Péter dühös volt."
✅ SHOWING: "Péter ökle elfehéredett a kormányon. Az állkapcsa megfeszült."

Kerülendő szavak: érezte, gondolta, tudta, rájött, megértette
Helyette: mutasd be a cselekvésen, testbeszéden, párbeszéden keresztül
`;

// ==================== NONFICTION CHAPTER STRUCTURE ====================

export const NONFICTION_CHAPTER_STRUCTURE = `
## FEJEZET FELÉPÍTÉSE (SZAKMAI KÖNYV - KÖTELEZŐ STRUKTÚRA):

### 1. HOOK / BEVEZETŐ (első 2-3 bekezdés)
- Kezdd problémával vagy történettel, ami rezonál az olvasóval
- "Ismerős ez a helyzet?" típusú kérdés
- Ígéret: mit fog megtanulni az olvasó ebből a fejezetből
- Cél: az olvasó érezze, hogy ez RÓLÁ szól

### 2. FŐ TARTALOM
Minden szekción belül:
- Koncepció bemutatása egyszerűen
- "Miért fontos ez?" - relevancia az olvasó életére
- A módszertan lépésről lépésre (számozott vagy bullet lista)
- Esettanulmány vagy személyes történet példaként

Formázás:
- Alcímek minden 300-500 szónál
- Kiemelések a kulcsmondatokhoz: **félkövér**
- Bullet listák a lépésekhez és jellemzőkhöz

### 3. GYAKORLATI RÉSZ (minden fejezetben!)
[CSINÁLD MOST DOBOZ]
Konkrét, 5 percen belül elvégezhető feladat:
1. Lépés
2. Lépés
3. Lépés
[/CSINÁLD MOST DOBOZ]

### 4. FEJEZET ÖSSZEFOGLALÓ
- 3-5 bullet point a kulcsüzenetekkel
- "Ha csak egy dolgot jegyzel meg ebből a fejezetből..."
- Átvezetés a következő fejezethez

### OPCIONÁLIS ELEMEK (ahol releváns):
- [STATISZTIKA: téma] - helykitöltő kutatási adatnak
- [IDÉZET: szakértő neve] - helykitöltő expert quote-nak
- [ELŐTTE/UTÁNA: szituáció] - transzformáció bemutatása
- [FIGYELMEZTETŐ TÁBLÁZAT] - gyakori hibák listája
`;

// ==================== EXPORT HELPER ====================

export function getCompleteWritingPrompt(config: QualityConfig, chapterNumber: number): string {
  const storyArc = config.storyArc || calculateDefaultStoryArc(10);
  const tensionLevel = getTensionLevel(chapterNumber, storyArc);

  const stylePrompt = buildCompleteStylePrompt({
    bookType: config.bookType,
    writingStyle: config.writingStyle,
    audienceLevel: config.targetAudience,
    tensionLevel: config.bookType === "regeny" ? tensionLevel : undefined,
    chapterNumber,
    totalChapters: storyArc.totalChapters,
  });

  if (config.bookType === "regeny") {
    return `${ADVANCED_FICTION_RULES}\n\n${stylePrompt}`;
  } else {
    return `${NONFICTION_CHAPTER_STRUCTURE}\n\n${stylePrompt}`;
  }
}
