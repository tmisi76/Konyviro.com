/**
 * POV (Point of View) drift detector.
 * Counts E/1 vs E/3 possessive endings in narration (excluding dialogue lines)
 * to detect when the AI accidentally switches between first and third person.
 */

/**
 * Strip dialogue lines (starting with "–" or "-") and quoted strings before counting.
 */
function stripDialogue(text: string): string {
  return text
    .split("\n")
    .filter((l) => !/^\s*[–-]\s/.test(l))
    .join("\n")
    .replace(/„[^"]*[”"]/g, "")
    .replace(/"[^"]*"/g, "");
}

/**
 * Count Hungarian E/1 possessive endings (kezem, hátam, fülem, szemem, ...).
 * Conservative: matches a curated list of common body / personal nouns ending in -m/-em/-am/-om/-im/-ám/-ém.
 */
const E1_POSSESSIVE = new RegExp(
  "\\b(kezem|kezeim|kezemet|kezemben|hátam|hátamon|hátamat|fülem|fülembe|fülemben|szemem|szememet|szememben|" +
    "arcom|arcomat|arcomon|szám|számba|számból|fejem|fejemet|fejemben|szívem|szívemet|szívemben|gyomrom|gyomromat|" +
    "torkom|torkomban|torkomat|tüdőm|tüdőmbe|mellkasom|mellkasomat|vállam|vállamat|lábam|lábamat|lábaim|" +
    "ujjaim|ujjamat|tenyerem|tenyeremet|halántékom|halántékomban|nyakam|nyakamat|csípőm|hajam|" +
    "gondolatom|gondolataim|érzésem|érzéseim|álmom|álmaim|emlékem|emlékeim|" +
    "anyám|apám|barátom|otthonom|szobám|házam|kocsim|autóm)\\b",
  "gi"
);

/**
 * Count Hungarian E/3 possessive endings (keze, háta, füle, szeme, ...).
 */
const E3_POSSESSIVE = new RegExp(
  "\\b(keze|kezét|kezében|kezei|háta|hátán|hátát|füle|fülébe|fülében|szeme|szemét|szemében|" +
    "arca|arcát|arcán|szája|szájába|szájából|feje|fejét|fejében|szíve|szívét|szívében|gyomra|gyomrát|" +
    "torka|torkában|torkát|tüdője|tüdejébe|mellkasa|mellkasát|válla|vállát|lába|lábát|lábai|" +
    "ujjai|ujját|tenyere|tenyerét|halántéka|halántékában|nyaka|nyakát|csípője|haja|" +
    "gondolata|gondolatai|érzése|érzései|álma|álmai|emléke|emlékei|" +
    "anyja|apja|barátja|otthona|szobája|háza|kocsija|autója)\\b",
  "gi"
);

export interface POVDriftResult {
  e1Count: number;
  e3Count: number;
  /** Dominant POV in the actual text. */
  detected: "first_person" | "third" | "mixed" | "unknown";
  /** Ratio of dominant POV to total (1.0 = pure, 0.5 = even mix). */
  purity: number;
  /** True if the project's expected POV does not match the dominant detected POV. */
  hasDrift: boolean;
}

export function detectPOVDrift(
  text: string,
  expectedPov: string | null | undefined
): POVDriftResult {
  const narration = stripDialogue(text);
  const e1 = (narration.match(E1_POSSESSIVE) || []).length;
  const e3 = (narration.match(E3_POSSESSIVE) || []).length;
  const total = e1 + e3;

  if (total < 5) {
    return { e1Count: e1, e3Count: e3, detected: "unknown", purity: 1, hasDrift: false };
  }

  const detected: "first_person" | "third" | "mixed" =
    e1 / total > 0.7 ? "first_person" : e3 / total > 0.7 ? "third" : "mixed";
  const purity = Math.max(e1, e3) / total;

  let hasDrift = false;
  if (expectedPov === "first_person") {
    hasDrift = detected !== "first_person";
  } else if (
    expectedPov === "third_limited" ||
    expectedPov === "third_omniscient" ||
    expectedPov === "multiple"
  ) {
    hasDrift = detected !== "third";
  }
  // If expectedPov is unknown but the text itself is mixed, also report drift.
  if (!hasDrift && detected === "mixed") hasDrift = true;

  return { e1Count: e1, e3Count: e3, detected, purity, hasDrift };
}

/**
 * Build an extra lector instruction asking to unify the POV.
 */
export function buildPOVFixInstruction(
  expectedPov: string | null | undefined,
  drift: POVDriftResult
): string {
  if (!drift.hasDrift) return "";
  const target =
    expectedPov === "first_person"
      ? "ELSŐ SZEMÉLYŰ (én-elbeszélő)"
      : "HARMADIK SZEMÉLYŰ (ő-elbeszélő)";
  return `\n\n## POV-CSÚSZÁS JAVÍTÁSA (KIEMELT FELADAT!)
A jelenetben nézőpont-keveredést észleltünk: ${drift.e1Count} db E/1 (-m, -em) végződés és ${drift.e3Count} db E/3 (-a, -e, -ja, -je) végződés keveredik a narrációban.

KÖTELEZŐ: A teljes narrációt egységesítsd ${target} formára.
- A párbeszédeket NE módosítsd — a karakterek továbbra is úgy beszéljenek, ahogy szoktak.
- KIZÁRÓLAG a narrációs (nem párbeszédes) mondatokat alakítsd át.
- "kezem → keze", "torkom → torka" típusú átírások szükségesek (ha E/3 a cél), vagy fordítva (ha E/1).
`;
}