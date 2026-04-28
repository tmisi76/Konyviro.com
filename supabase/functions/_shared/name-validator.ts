// Hungarian function-word blacklist: words that must NEVER be treated as proper names.
// Used by post-write validation to catch "Ahogy atya" / "Pedig nyomozó" type AI hallucinations.
export const HU_FUNCTION_WORDS = new Set<string>([
  "ahogy", "ahogyan", "csak", "pedig", "akár", "akármeddig", "hiszen",
  "viszont", "ugyan", "bárcsak", "talán", "mégis", "illetve", "miközben",
  "mintha", "ámbár", "jóllehet", "hiszen", "hanem", "hogy", "mert", "tehát",
  "ezért", "azért", "mivel", "mire", "mikor", "amikor", "amíg", "ameddig",
  "noha", "habár", "merthogy", "amennyiben", "amennyire", "amilyen",
  "olyan", "ilyen", "minden", "semmi", "valami", "akármi", "bárki",
  "valaki", "ennyi", "annyi", "így", "úgy", "egyszer", "kétszer",
  "szinte", "majdnem", "éppen", "épp", "máris", "máskor", "néha",
  "ritkán", "gyakran", "soha", "mindig", "azonnal", "rögtön",
]);

// Common honorifics / role-suffixes that follow a name in Hungarian.
const HONORIFIC_SUFFIXES = [
  "atya", "néni", "bácsi", "úr", "asszony", "kisasszony",
  "mester", "főnök", "főnyomozó", "doktor", "professzor", "tanár",
  "tanárnő", "ügyvéd", "elvtárs", "kapitány", "nyomozó", "őrmester",
  "hadnagy", "ezredes", "tábornok",
];

const NAME_BEFORE_HONORIFIC = new RegExp(
  `\\b([A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüűéá]+)\\s+(${HONORIFIC_SUFFIXES.join("|")})\\b`,
  "g"
);

export interface NameValidationIssue {
  invalidName: string;
  honorific: string;
  context: string;
  position: number;
}

/**
 * Scan text for "X atya" / "Y nyomozó" type patterns where X is a Hungarian
 * function word (e.g. "Ahogy atya"). Returns a list of issues so the caller
 * can request a regeneration with stronger constraints.
 */
export function findInvalidHonorificNames(
  text: string,
  knownCharacterNames: string[] = []
): NameValidationIssue[] {
  const issues: NameValidationIssue[] = [];
  const knownLower = new Set(knownCharacterNames.map((n) => n.toLowerCase().split(/\s+/)[0]));

  let m: RegExpExecArray | null;
  NAME_BEFORE_HONORIFIC.lastIndex = 0;
  while ((m = NAME_BEFORE_HONORIFIC.exec(text)) !== null) {
    const candidate = m[1];
    const lower = candidate.toLowerCase();
    if (HU_FUNCTION_WORDS.has(lower)) {
      // Only flag if it's not a known character first name
      if (!knownLower.has(lower)) {
        const start = Math.max(0, m.index - 40);
        const end = Math.min(text.length, m.index + m[0].length + 40);
        issues.push({
          invalidName: candidate,
          honorific: m[2],
          context: text.slice(start, end),
          position: m.index,
        });
      }
    }
  }
  return issues;
}

/**
 * Build a focused regeneration instruction for the next AI call when invalid
 * honorific names are found.
 */
export function buildNameValidationFeedback(issues: NameValidationIssue[]): string {
  if (issues.length === 0) return "";
  const examples = issues.slice(0, 5).map((i) => `"${i.invalidName} ${i.honorific}"`).join(", ");
  return [
    "KRITIKUS NÉVHASZNÁLATI HIBA AZ ELŐZŐ JELENETBEN:",
    `A következő szókapcsolatok hibásak — magyar funkciószavak NEM lehetnek karakternevek: ${examples}.`,
    "Mostantól MINDEN megszólításnál (pl. 'Kovács atya', 'Tóth néni') győződj meg róla, hogy a név előtt valódi tulajdonnév áll, NEM kötőszó vagy határozószó.",
  ].join("\n");
}
