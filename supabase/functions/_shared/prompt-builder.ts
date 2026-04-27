/**
 * Shared prompt building utilities for scene/section generation.
 * Extracted from write-scene and write-section to enable reuse across all generation functions.
 */

export const HUNGARIAN_GRAMMAR_RULES = `

## MAGYAR NYELVI SZABÁLYOK (KÖTELEZŐ):

NÉVSORREND (CSAK MAGYAR NEVEKNÉL!):
- Magyar nevek esetében: Vezetéknév + Keresztnév (pl. "Kovács János", NEM "János Kovács").
- KÜLFÖLDI / IDEGEN nevek (pl. John Smith, Eleanor Hayes, Tanaka Haruki, Lars Eriksson) maradjanak az adott kultúra eredeti névsorrendjében — ezeket TILOS magyarosítani vagy felcserélni!
- FANTASY / SCI-FI / KITALÁLT nevek (pl. Géza, Aelora, Zyx-7) maradjanak pontosan úgy, ahogy a kontextusban szerepelnek.
- TILOS bármilyen nevet "magyarítani" (pl. John → János, Smith → Kovács), megrövidíteni vagy lecserélni.

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
- Magyar neveknél NE használj angolszász névsorrendet
- Külföldi neveknél NE használj magyar névsorrendet — hagyd az eredeti formában
- NE használj tükörfordításokat ("ez csinál értelmet" → "ennek van értelme")
- NE használj angol idézőjeleket ("..." → „...")
- NE használj felesleges névelőket angolosan

NYELVTANI HELYESSÉG:
- Ragozás: ügyelj a magyar ragozás helyességére
- Szórend: magyar szórend, NEM angol (ige-alany-tárgy)
- Összetett szavak: egybe vagy külön az MTA szabályai szerint
`;

/**
 * Cultural / nationality naming guide.
 * Used by both generate-story (initial character creation) and the writing engine
 * (write-scene, write-section, process-next-scene, outline generators) so that
 * NEW characters introduced mid-book also follow the chosen cultural convention.
 */
export const NATIONALITY_GUIDE: Record<string, string> = {
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
  ai_choose:    "a történet helyszínéhez, korszakához és kulturális kontextusához illő nevek",
};

/**
 * Build a "new character naming guide" prompt block.
 * Used by writing engines AND outline generators so that ANY new character
 * introduced after the initial cast also matches the chosen culture/setting.
 */
export function buildNewCharacterNamingGuide(
  characterNationality: string | null | undefined,
  setting: string | null | undefined,
  existingCharacterNames: string[] = []
): string {
  const key = (characterNationality && NATIONALITY_GUIDE[characterNationality])
    ? characterNationality
    : "ai_choose";
  const hint = NATIONALITY_GUIDE[key];
  const settingHint = (setting && setting.trim().length > 0)
    ? `\n- A történet helyszíne / korszaka: ${setting.trim()}. Ehhez illő nevek!`
    : "";
  const existingBlock = existingCharacterNames.length > 0
    ? `\n- TILOS megismételni vagy alig módosítani ezeket a meglévő neveket: ${existingCharacterNames.join(", ")}.`
    : "";

  return `

## ÚJ KARAKTEREK NEVEI (ha bármilyen új mellékszereplőt vezetsz be):
- Az új karakterek nevei kapjanak ${hint}.${settingHint}${existingBlock}
- A nevek legyenek változatosak, EGYEDIEK és kulturálisan hitelesek.
- Kerüld a sablonokat: John Smith, John Doe, Kovács János, Nagy Péter, Szabó István.
- Ha a felhasználó már létrehozott karaktereket (lásd KARAKTERNÉV ZÁR), AZOK pontosan úgy maradnak, ahogy ott szerepelnek — ez a szabály csak az új szereplőkre vonatkozik.`;
}

export const NO_MARKDOWN_RULE = `

FORMÁZÁSI SZABÁLY (KÖTELEZŐ):
- NE használj markdown jelölőket (**, ##, ***, ---, \`\`\`, stb.)
- Címsorokhoz használj normál mondatformátumot új sorban (NEM csupa nagybetűt)
- TILOS a CSUPA NAGYBETŰS írás (kivéve rövidítések: EU, AI, stb.)
- Írj tiszta, folyamatos prózát jelölések nélkül
`;

export const UNIVERSAL_FICTION_RULES = `
## FŐ ÍRÓI SZABÁLYOK:
- Mutass, ne mondj! ("Show, don't tell") - Érzéseket, gondolatokat cselekvésen és testi reakciókon keresztül mutasd be
- Írj élethű, természetes párbeszédeket - minden szereplőnek legyen saját hangja
- Építs feszültséget fokozatosan
- Használj érzékletes leírásokat: szagok, hangok, textúrák, nem csak vizuális
- A szereplők NEM tökéletesek - legyenek hibáik, belső konfliktusaik
- Kerüld a klisés fordulatokat és a kiszámítható megoldásokat
- Minden fejezetnek legyen "hook"-ja a végén, ami tovább viszi az olvasót

## FORMÁZÁS (KRITIKUS - KÖTELEZŐ):
- NE HASZNÁLJ markdown szintaxist (**, ##, ***, ---, \`\`\`, stb.)
- Írj tiszta, formázatlan prózát jelölések nélkül
- Párbeszédeknél használj magyar idézőjeleket: „szöveg"
- Gondolatjel: – (nem -)
- A szöveg folyamatos, olvasható próza legyen, semmilyen jelöléssel
${HUNGARIAN_GRAMMAR_RULES}`;

// Genre-specific writing rules
export const GENRE_PROMPTS: Record<string, string> = {
  thriller: `
## THRILLER SZABÁLYOK:
- Minden fejezetnek emelje a tétet
- "Ticking clock" elem: legyen időnyomás
- Red herring-ek: hints félrevezető nyomokat
- A főhős legyen aktív, ne csak passzívan elszenvedje az eseményeket
- Információt adagolj óvatosan - az olvasó mindig csak egy lépéssel járjon a főhős mögött
- Cliffhangerek a fejezetek végén
- A végső csavar legyen fair: visszanézve legyenek a jelek, de ne legyen kiszámítható`,

  krimi: `
## KRIMI SZABÁLYOK:
- A nyomok legyenek fair play szerint elrejtve - az olvasó is megoldhassa
- Építs gyanút több szereplő köré
- A detektív módszere legyen következetes és jellemző rá
- A megoldás legyen logikus, de meglepő
- A motiváció legyen emberi és hihető`,

  horror: `
## HORROR SZABÁLYOK:
- A félelem a NEM LÁTOTTBÓL jön - csak sejtesd, ne mutass mindent
- Használd a "wrongness" érzést - valami nincs rendben, de nem tudni mi
- Építs hamis biztonságérzeteket, majd rombold le
- A hétköznapi dolgok legyenek félelmetesek (uncanny)
- Izoláció: a főhős legyen egyedül a bajban
- "Slow burn": a horror fokozatosan épüljön, ne rögtön 100-on induljon
- Az olvasó képzelete a legerősebb fegyver - hagyd dolgozni`,

  erotikus: `
## INTIM JELENETEK SZABÁLYAI:
- Az erotikus jelenetek NE legyenek öncélúak - vigyék előre a kapcsolatot vagy a cselekményt
- Használj változatos szókincset - kerüld az ismétlést
- Fókuszálj az érzésekre, érzelmekre, nem csak a fizikai aktusra
- Építs feszültséget a jelenet ELŐTT (anticipation)
- A beleegyezés legyen egyértelmű, de ne legyen mesterkélt
- A karakterek személyisége tükröződjön az intimitásukban is
- Váltogasd a tempót: lassú, érzéki pillanatok + intenzív pillanatok`,

  romantikus: `
## ROMANTIKUS SZABÁLYOK:
- Építsd a kémiát fokozatosan - ne siess a "nagy pillanattal"
- A szerelmi szál mellett legyen egyéni fejlődési ív mindkét karakternek
- Használj "almost but not quite" pillanatokat a feszültségépítéshez
- A félreértések legyenek valósak, ne mesterségesek
- Mutasd a sebezhetőséget és a bizalom kiépülését
- A HEA (Happy Ever After) felé vezető út legyen izgalmas és kihívásokkal teli`,

  fantasy: `
## FANTASY SZABÁLYOK:
- A mágia legyen következetes szabályokkal
- A világépítés legyen organikus - ne info-dumpelj
- Az idegen elemek (lények, kultúrák) legyenek belülről logikusak
- A főhős ereje legyen kiérdemelt, ne "chosen one" cliché
- A konfliktusok legyenek személyesek is, ne csak epikusak`,

  scifi: `
## SCI-FI SZABÁLYOK:
- A technológia legyen következetes és belülről logikus
- A tudományos elemek szolgálják a történetet, ne fordítva
- Mutasd a technológia társadalmi hatásait
- Az ember maradjon a középpontban, ne a kütyük
- "One big lie" szabály: egy fő spekulatív elem körül építkezz`,

  drama: `
## DRÁMA SZABÁLYOK:
- A karakterfejlődés legyen a középpontban
- A konfliktusok legyenek belső és külső szinten is jelen
- Kerüld a melodrámát - a fájdalom legyen valódi, ne túljátszott
- A párbeszédek legyenek rétegzettek - amit mondanak vs. amit gondolnak
- A katarzis legyen megérdemelt és felépített`,

  kaland: `
## KALAND SZABÁLYOK:
- Tartsd fenn a lendületet - valami mindig történjen
- A veszélyek legyenek valósak, legyen tétje a cselekménynek
- A főhős legyen találékony és aktív
- A helyszínek legyenek karakteresek és emlékezetesek
- Az akciók legyenek vizuálisan elképzelhetők`,

  tortenelmi: `
## TÖRTÉNELMI SZABÁLYOK:
- A korszak légköre legyen hiteles - nyelvezet, szokások, tárgyak
- Ne modernizáld túl a karakterek gondolkodását
- A történelmi események szolgálják a személyes történetet
- A részletek legyenek pontosak, de ne lecke-szerűek
- Mutasd a mindennapi életet, ne csak a nagy eseményeket`,
};

// Label maps for fiction style settings
export const POV_LABELS: Record<string, string> = {
  first_person: "Első személy (Én-elbeszélő)",
  third_limited: "Harmadik személy, korlátozott nézőpont",
  third_omniscient: "Harmadik személy, mindentudó narrátor",
  multiple: "Váltakozó nézőpont",
};

export const PACE_LABELS: Record<string, string> = {
  slow: "Lassú - részletes leírások, atmoszféra-építés",
  moderate: "Közepes - kiegyensúlyozott ritmus",
  fast: "Gyors - akciódús, dinamikus",
  variable: "Változó - feszültséghez igazodó tempó",
};

export const DIALOGUE_LABELS: Record<string, string> = {
  minimal: "Kevés párbeszéd - főleg narráció",
  balanced: "Kiegyensúlyozott párbeszéd-narráció arány",
  heavy: "Sok párbeszéd - párbeszéd-központú",
};

export const DESCRIPTION_LABELS: Record<string, string> = {
  sparse: "Minimális leírás - akció fókusz",
  moderate: "Közepes leírás - kulcsjelenetek részletezve",
  rich: "Gazdag leírás - érzékletes, atmoszférikus",
};

/**
 * Build user's writing style profile prompt section.
 */
export function buildStylePrompt(styleProfile: Record<string, unknown> | null): string {
  if (!styleProfile || !styleProfile.style_summary) return "";

  const parts: string[] = ["\n\n--- FELHASZNÁLÓ ÍRÓI STÍLUSA ---"];
  parts.push(`Stílus összefoglaló: ${styleProfile.style_summary}`);

  if (styleProfile.avg_sentence_length) {
    parts.push(`Átlagos mondathossz: ${styleProfile.avg_sentence_length} szó`);
  }
  if (styleProfile.vocabulary_complexity) {
    const complexity = Number(styleProfile.vocabulary_complexity);
    const level = complexity < 4 ? "egyszerű" : complexity < 7 ? "közepes" : "összetett";
    parts.push(`Szókincs komplexitás: ${level}`);
  }
  if (styleProfile.dialogue_ratio) {
    parts.push(`Párbeszéd arány: ${Math.round(Number(styleProfile.dialogue_ratio) * 100)}%`);
  }
  if (styleProfile.common_phrases && Array.isArray(styleProfile.common_phrases)) {
    parts.push(`Jellemző kifejezések: ${(styleProfile.common_phrases as string[]).slice(0, 10).join(", ")}`);
  }

  parts.push("FONTOS: Utánozd a fenti stílus jegyeket!");
  parts.push("--- STÍLUS VÉGE ---");

  return parts.join("\n");
}

/**
 * Build fiction style settings prompt section (POV, pace, dialogue, genre rules).
 */
export function buildFictionStylePrompt(fictionStyle: Record<string, unknown> | null, subcategory: string | null): string {
  if (!fictionStyle) return "";

  const parts: string[] = ["\n\n## ÍRÓI STÍLUS BEÁLLÍTÁSOK:"];

  if (fictionStyle.pov) {
    parts.push(`- Nézőpont: ${POV_LABELS[fictionStyle.pov as string] || fictionStyle.pov}`);
  }
  if (fictionStyle.pace) {
    parts.push(`- Tempó: ${PACE_LABELS[fictionStyle.pace as string] || fictionStyle.pace}`);
  }
  if (fictionStyle.dialogueRatio) {
    parts.push(`- Párbeszédek: ${DIALOGUE_LABELS[fictionStyle.dialogueRatio as string] || fictionStyle.dialogueRatio}`);
  }
  if (fictionStyle.descriptionLevel) {
    parts.push(`- Leírások: ${DESCRIPTION_LABELS[fictionStyle.descriptionLevel as string] || fictionStyle.descriptionLevel}`);
  }
  if (fictionStyle.setting) {
    parts.push(`- Helyszín/korszak: ${fictionStyle.setting}`);
  }

  // Add genre-specific rules
  const genrePrompt = subcategory ? GENRE_PROMPTS[subcategory] : null;
  if (genrePrompt) {
    parts.push(genrePrompt);
  }

  // Add universal fiction rules
  parts.push(UNIVERSAL_FICTION_RULES);

  return parts.join("\n");
}

/**
 * Build character context string from character data.
 * Now includes strict name lock instructions.
 */
export function buildCharacterContext(characters: Array<{
  name: string;
  role?: string;
  positive_traits?: string[];
  negative_traits?: string[];
  speech_style?: string;
  development_arc?: Record<string, string> | null;
}> | null): string {
  if (!characters || characters.length === 0) return "";

  const charLines = characters.map(c => {
    let line = `- ${c.name} (${c.role || "szereplő"}): ${(c.positive_traits || []).slice(0, 3).join(", ")}${c.negative_traits?.length ? ` | Hibák: ${c.negative_traits.slice(0, 2).join(", ")}` : ""} | Beszédstílus: ${c.speech_style || "általános"}`;
    const arc = c.development_arc;
    if (arc && arc.start_state && arc.end_state) {
      line += ` | Karakterív: ${arc.start_state} → ${arc.end_state}`;
    }
    return line;
  }).join("\n");

  return `\n\nKARAKTEREK:\n${charLines}\n\n⚠️ NÉVHASZNÁLATI SZABÁLY: A fenti neveket PONTOSAN így használd. NE változtasd meg, NE magyarosítsd, NE cseréld fel egyetlen nevet sem!`;
}

/**
 * Build character name lock to prevent AI from renaming or Hungarianizing names.
 */
export function buildCharacterNameLock(characters: Array<{ name: string }> | null): string {
  if (!characters || characters.length === 0) return "";

  const names = characters.map(c => c.name);
  return `\n\n--- KARAKTERNÉV ZÁR (VÁLTOZTATHATATLAN!) ---
A következő karakternevek SZENTEK és MEGVÁLTOZTATHATATLANOK:
${names.map(n => `• ${n}`).join('\n')}

TILOS:
- Nevet megváltoztatni, magyarosítani, becézni vagy rövidíteni
- Új nevet kitalálni meglévő karakternek
- Vezetéknév-keresztnév sorrendet megcserélni
- Karaktert más néven említeni mint ami a listában van
Ha egy karakter neve "John Smith", akkor végig "John Smith" marad, NEM "Smith János" vagy "Jancsi".
---`;
}

/**
 * Build POV enforcement rules based on project and scene settings.
 */
export function buildPOVEnforcement(
  scenePov: string | null,
  projectPov: string | null,
  povCharacterName?: string
): string {
  const effectivePov = scenePov || projectPov || 'third_limited';
  const charName = povCharacterName || 'a POV karakter';

  const rules: string[] = [`\n\n--- NÉZŐPONT ZÁR ---`];
  rules.push(`POV KARAKTER: ${charName}`);

  switch (effectivePov) {
    case 'first_person':
      rules.push(`NÉZŐPONT: Első személy (ÉN-elbeszélő)`);
      rules.push(`- A teljes narráció ÉN-formában szól, végig ${charName} szemszögéből`);
      rules.push(`- TILOS harmadik személybe váltani`);
      rules.push(`- Csak azt írhatod le, amit ${charName} lát, hall, érez, gondol`);
      break;
    case 'third_limited':
      rules.push(`NÉZŐPONT: Harmadik személy, korlátozott`);
      rules.push(`- A narráció ${charName} fejéből szól`);
      rules.push(`- CSAK ${charName} gondolatait és érzéseit írhatod le`);
      rules.push(`- Más karakterek gondolatai TILTOTTAK — csak a viselkedésüket, szavaikat, arckifejezésüket írd le`);
      rules.push(`- Minden leírás ${charName} szubjektív észlelésén keresztül szűrődjön`);
      break;
    case 'third_omniscient':
      rules.push(`NÉZŐPONT: Harmadik személy, mindentudó`);
      rules.push(`- Bármely karakter gondolataiba belenézhetsz`);
      rules.push(`- De fókuszálj elsősorban ${charName}-ra ebben a jelenetben`);
      break;
    default:
      rules.push(`NÉZŐPONT: ${effectivePov}`);
  }

  rules.push(`---`);
  return rules.join('\n');
}

/**
 * Build character history context from previous chapters' character_appearances.
 */
export function buildCharacterHistoryContext(
  characterAppearances: Array<{ name: string; actions: string[] }[]>
): string {
  if (!characterAppearances || characterAppearances.length === 0) return "";

  const history: Record<string, string[]> = {};
  for (const chapterAppearances of characterAppearances) {
    if (!Array.isArray(chapterAppearances)) continue;
    for (const app of chapterAppearances) {
      if (!app?.name || !Array.isArray(app.actions)) continue;
      if (!history[app.name]) history[app.name] = [];
      history[app.name].push(...app.actions.slice(-3));
    }
  }

  const entries = Object.entries(history);
  if (entries.length === 0) return "";

  return "\n\n--- KARAKTER ELŐZMÉNYEK ---\nAz alábbi karakterek mit csináltak az előző fejezetekben:\n" +
    entries.map(([name, actions]) =>
      `${name}:\n${actions.slice(-5).map(a => `- ${a}`).join("\n")}`
    ).join("\n\n") +
    "\n\nFONTOS: Tartsd szem előtt ezeket az előzményeket! A karakterek NE ismételjék meg, amit már megtettek, és NE mutatkozzanak be újra!\n---";
}

/**
 * Build previous chapters summary context string.
 */
export function buildPreviousChaptersSummary(
  chapters: Array<{ title: string; summary?: string | null; sort_order: number }>,
  currentSortOrder: number
): string {
  const previousWithSummary = chapters
    .filter(ch => ch.sort_order < currentSortOrder && ch.summary)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (previousWithSummary.length === 0) return "";

  return "\n\n--- ELŐZŐ FEJEZETEK ÖSSZEFOGLALÓJA ---\n" +
    previousWithSummary.map(ch => `${ch.title}: ${ch.summary}`).join("\n\n") +
    "\n\nFONTOS: Tartsd szem előtt az előző fejezetekben történteket! A cselekmény legyen folytonos és konzisztens.\n---";
}

/**
 * Build scene position context (opening/middle/closing, book position).
 */
export function buildScenePositionContext(
  sceneIndex: number,
  totalScenes: number,
  chapterIndex: number,
  totalChapters: number
): string {
  const parts: string[] = [`\n\n--- JELENET POZÍCIÓ ---`];

  // Scene position within chapter
  if (sceneIndex === 0) {
    parts.push(`Ez a fejezet NYITÓ jelenete.`);
    parts.push(`- Kezdj erős hookkal — az első mondat ragadja meg az olvasót`);
    parts.push(`- Határozd meg a helyszínt és a hangulatot gyorsan, de érzékletesen`);
  } else if (sceneIndex === totalScenes - 1) {
    parts.push(`Ez a fejezet ZÁRÓ jelenete.`);
    parts.push(`- Építs a csúcspont felé`);
    parts.push(`- A fejezet végén hagyj hookot: kérdés, feszültség, fordulat, ami a következő fejezetbe húzza az olvasót`);
  } else {
    parts.push(`Ez a fejezet ${sceneIndex + 1}. jelenete (${totalScenes}-ből).`);
    parts.push(`- Tartsd fenn a lendületet és a feszültséget`);
  }

  // Book position
  const bookProgress = (chapterIndex + 1) / totalChapters;
  if (bookProgress < 0.15) {
    parts.push(`KÖNYV POZÍCIÓ: A könyv eleje — ismerkedés a világgal és karakterekkel, de NE info-dumpelj!`);
  } else if (bookProgress < 0.3) {
    parts.push(`KÖNYV POZÍCIÓ: Első felvonás vége — a tét emelkedik, a konfliktus körvonalazódik`);
  } else if (bookProgress < 0.5) {
    parts.push(`KÖNYV POZÍCIÓ: Második felvonás — a főhős aktívan küzd, akadályok jönnek`);
  } else if (bookProgress < 0.75) {
    parts.push(`KÖNYV POZÍCIÓ: Második felvonás vége — a dolgok egyre rosszabbra fordulnak, a tét maximális`);
  } else if (bookProgress < 0.9) {
    parts.push(`KÖNYV POZÍCIÓ: Harmadik felvonás — a klimax felé haladunk, minden szál összefut`);
  } else {
    parts.push(`KÖNYV POZÍCIÓ: A könyv vége — a végkifejlet, a szálak lezárása`);
  }

  parts.push(`---`);
  return parts.join('\n');
}

/**
 * Anti-summary rules to prevent narrative summarization style.
 */
export function buildAntiSummaryRules(): string {
  return `\n\n--- ANTI-ÖSSZEFOGLALÓ SZABÁLYOK ---
TILOS összefoglaló stílusban írni! Minden eseményt JELENETKÉNT, valós időben írj meg.

TILOS mondatkezdések:
- "Aztán…", "Később…", "Ezután…", "Végül…", "Majd…"
- "Az elkövetkező napokban…", "A hetek múlásával…"
- "Miután megbeszélték…", "Amikor végeztek…"

EHELYETT: Írd meg a konkrét pillanatot, a cselekvést, a párbeszédet. Ha nem fontos részletesen megírni → HAGYD KI, ne foglald össze!

ROSSZ: "Aztán hazamentek és megvacsoráztak. Később Péter elment aludni."
JÓ: "A lakásajtó becsukódott mögöttük. Péter lehuppant a konyhai székre, és a kabátját sem vetette le, mielőtt a tányérja fölé hajolt."
---`;
}

/**
 * Dialogue variety rules to prevent repetitive speech tags.
 */
export function buildDialogueVarietyRules(): string {
  return `\n\n--- PÁRBESZÉD VARIÁCIÓ SZABÁLYOK ---
PÁRBESZÉD TAG KORLÁTOZÁSOK (SZIGORÚ!):
- "mondta" MAXIMUM 3x jelenetenként
- "suttogta" MAXIMUM 1x jelenetenként — különleges pillanatokra fenntartva!
- "kérdezte" MAXIMUM 2x jelenetenként
- "válaszolta" MAXIMUM 1x jelenetenként

PÁRBESZÉD TAG TECHNIKÁK (kötelező váltogatni!):
1. AKCIÓ-TAG (PREFERÁLT!): "– Elég volt. Anna a tenyerét az asztalra csapta."
2. TAG NÉLKÜL: "– És mit vársz tőlem?"
3. GONDOLAT-TAG: "– Persze. Mintha bárkit is érdekelt volna."
4. LEÍRÁS-TAG: "– Gyere ide. A hangja alig volt több suttogásnál."
5. CSELEKVÉS KÖZBENI: "– Nem érdekel. Felkapta a kabátját és az ajtó felé indult."

ARÁNY: A párbeszéd sorok LEGALÁBB 40%-a legyen TAG NÉLKÜLI.
TILOS: Egymás után 3x azonos tag-típust használni.
---`;
}

/**
 * Anti-repetition rules using previous content snippet.
 */
export function buildAntiRepetitionPrompt(previousContentSnippet?: string | null): string {
  if (!previousContentSnippet || previousContentSnippet.trim().length < 100) return "";

  return `\n\n--- ISMÉTLÉS MEGELŐZÉS ---
Az előző jelenet utolsó részlete (NE ISMÉTELD MEG!):
"${previousContentSnippet.slice(-1500)}"

SZABÁLYOK:
- NE kezdd ugyanazzal a mondattal vagy hasonló nyitással
- NE ismételd meg az előző jelenet eseményeit, érzéseit, leírásait
- Ha az előző jelenet végén valaki mondott valamit, NE ismételd meg szó szerint
- Használj más szókincset, más leírásokat, más tempót
---`;
}

export function buildBodyLanguageVarietyRules(): string {
  return `\n\n--- TESTBESZÉD VARIÁCIÓ SZABÁLYOK ---
TESTI REAKCIÓ KORLÁTOZÁSOK:
- "gyomra összeszorult/görcsbe rándult" → MAX 1x per fejezet. Alternatívák: torka kiszáradt, háta közepén hideg futott végig, tenyere verejtékezni kezdett, ujjhegyei elzsibbadtak
- "szíve a torkában dobogott" → MAX 1x per fejezet. Alternatívák: pulzusa felszökött, halántéka lüktetett, mellkasa összeszorult
- "ujjai elfehéredtek" → MAX 1x per fejezet. Alternatívák: ujjai begörbültek, keze ökölbe szorult, körme a tenyerébe vájt
- "megborzongott/libabőrös lett" → MAX 1x per fejezet. Alternatívák: a tarkóján égett a bőr, karján felállt a szőr, gerince mentén hideg áradt szét
MINDEN testi reakciót VÁLTOZATOSAN használj — ne ismételd ugyanazt a jeleneten belül!`;
}

export function buildSceneOpeningRules(): string {
  return `\n\n--- JELENETNYITÁS SZABÁLYOK ---
TILTOTT JELENETNYITÁS:
- "A laptop/monitor/képernyő kékes fénye megvilágította..." — SOHA NE HASZNÁLD!
- "A kékes fény" kifejezés TILTOTT az egész szövegben!

JELENETNYITÁS TECHNIKÁK (minden jelenetben MÁST használj!):
1. PÁRBESZÉD: "– Ezt nem gondolhatod komolyan."
2. CSELEKVÉS: "Anna a kulcsot a zárba fordította, de a keze megállt félúton."
3. ÉRZÉKSZERV: "A folyosóról kávéillat és halk nevetés szűrődött be."
4. GONDOLAT: "Valami nem stimmelt."
5. ATMOSZFÉRA: "A hajnali köd úgy ült a városra, mint egy nehéz takaró."

SZINTÉN TILTOTT az egész szövegben:
- "Ez nem lehet igaz" — MAXIMUM 1x az egész könyvben
- "hangja rekedt volt" — MAXIMUM 1x fejezetenként
---`;
}

/**
 * Extract candidate character names from a free-form story idea / concept text.
 * Heuristic: capitalized tokens (1-3 word sequences) that are not common Hungarian words / sentence starters.
 * Used to lock user-provided names so the AI never renames or hungarianizes them.
 */
const NAME_STOPWORDS = new Set<string>([
  // Hungarian sentence/connective starters
  "A", "Az", "Egy", "És", "De", "Ha", "Mikor", "Amikor", "Hogy", "Mert", "Vagy", "Sem",
  "Igen", "Nem", "Talán", "Mégis", "Akkor", "Most", "Ott", "Itt", "Ez", "Az", "Ezek", "Azok",
  "Például", "Ugyanis", "Tehát", "Pedig", "Ami", "Aki", "Amely", "Amelyik",
  // Headings often present in concept text
  "Téma", "Cél", "Helyszín", "Műfaj", "Hangnem", "Célközönség", "Karakterek", "Konfliktus",
  "Befejezés", "Szereplők", "Kapcsolat", "Történet", "Főszereplő", "Antagonista",
  "Szinopszis", "Fejezet", "Bevezetés", "Összefoglaló",
  // Geographic / generic
  "Budapest", "Magyarország", "Európa", "Amerika", "Ázsia", "Tokió", "London", "Párizs",
  "Galaktikus", "Szövetség", "Birodalom", "Föld", "Mars",
]);

export function extractCandidateCharacterNames(text: string | null | undefined): string[] {
  if (!text || typeof text !== "string") return [];

  // Match sequences of 1-3 capitalized tokens. Allow Hungarian accents and hyphens.
  // A token starts with an uppercase Hungarian/Latin letter and continues with lowercase letters / hyphen.
  const tokenRe = /\b([A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű\-']{1,})(?:\s+([A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű\-']{1,}))?(?:\s+([A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű\-']{1,}))?/g;

  const found = new Map<string, number>();
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(text)) !== null) {
    const parts = [m[1], m[2], m[3]].filter(Boolean) as string[];
    if (parts.length === 0) continue;
    // Skip if the FIRST token is a stopword and we have only one token — it's likely just a sentence start.
    if (parts.length === 1 && NAME_STOPWORDS.has(parts[0])) continue;
    // Skip if every token is a stopword
    if (parts.every(p => NAME_STOPWORDS.has(p))) continue;

    // Strip trailing stopwords from a multi-token match (e.g. "Géza A" → "Géza")
    while (parts.length > 1 && NAME_STOPWORDS.has(parts[parts.length - 1])) {
      parts.pop();
    }
    // Strip leading stopwords (e.g. "A Géza" → "Géza")
    while (parts.length > 1 && NAME_STOPWORDS.has(parts[0])) {
      parts.shift();
    }
    if (parts.length === 0) continue;
    if (parts.length === 1 && NAME_STOPWORDS.has(parts[0])) continue;

    const candidate = parts.join(" ");
    // Names should be 2-40 chars
    if (candidate.length < 2 || candidate.length > 40) continue;

    found.set(candidate, (found.get(candidate) || 0) + 1);
  }

  // Keep candidates that either appear at least once, sorted by frequency desc.
  return Array.from(found.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 12);
}

/**
 * Build a name lock block from raw extracted names (e.g. from the user's story idea).
 * Use this in `generate-story` BEFORE characters exist in the database.
 */
export function buildExtractedNameLock(names: string[]): string {
  if (!names || names.length === 0) return "";
  return `\n\n--- FELHASZNÁLÓI KARAKTERNÉV ZÁR (KÖTELEZŐ!) ---
A felhasználó az ötletében / koncepciójában az alábbi neveket említette. Ezek SZENTEK:
${names.map(n => `• ${n}`).join("\n")}

SZIGORÚ SZABÁLYOK:
- TILOS ezeket a neveket átírni, magyarosítani vagy más nyelvre fordítani.
- Ha a felhasználó "Géza"-ról írt, akkor a karakter neve végig "Géza" marad — NEM lesz belőle "Greg", "Gergely", "Gabe" vagy bármi más.
- Ha a név külföldinek tűnik (pl. "John Smith", "Aelora", "Zyx-7"), TILOS magyarosítani vagy lecserélni magyar névre.
- A megadott karakterek fizikai jellemzőit (bőrszín, csápok, korszak, faj stb.) is meg KELL tartani — nem cserélheted "földi emberre" őket.
- A koncepció és a karakterlista MINDEN előfordulásánál pontosan ezeket a neveket használd.
---`;
}
