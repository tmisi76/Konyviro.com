/**
 * Cliché tracker for repetitive body-reaction phrases.
 * Tracks per-chapter and per-book occurrence counts of overused phrases
 * (e.g. "torka kiszáradt", "mellkasa összeszorult") and flags when limits are reached.
 */

/**
 * Canonical list of tracked clichés. The KEY is the canonical id (used in JSONB),
 * the VALUE.patterns are the regex patterns that match all morphological variants.
 */
export const TRACKED_CLICHES: Record<
  string,
  { label: string; patterns: RegExp[]; alternatives: string[] }
> = {
  torka_kiszaradt: {
    label: "torka kiszáradt",
    patterns: [/torka\s+kisz[áa]radt/gi, /torkom\s+kisz[áa]radt/gi],
    alternatives: [
      "nyelve a szájpadláshoz tapadt",
      "ajkai megrepedtek",
      "nyelt egyet, de nem volt mit",
    ],
  },
  mellkasa_osszeszorult: {
    label: "mellkasa összeszorult",
    patterns: [/mellkasa\s+[öo]ssze\s*szorult/gi, /mellkasom\s+[öo]ssze\s*szorult/gi],
    alternatives: [
      "nehéz lett a légzése",
      "a bordái között valami kemény dolog feszült",
      "a tüdeje nem akart megtelni",
    ],
  },
  ver_dubogott: {
    label: "vér a fülében/halántékában dübörgött",
    patterns: [
      /v[ée]r\s+(a\s+)?f[üu]l[ée]ben\s+d[üu]b[öo]rg[öo]tt/gi,
      /v[ée]r\s+(a\s+)?hal[áa]nt[ée]k[áa]ban\s+d[üu]b[öo]rg[öo]tt/gi,
    ],
    alternatives: [
      "saját pulzusát hallotta a csendben",
      "egy lüktetés indult a halántéka mögött",
      "elnyomta a hangokat egy belső zúgás",
    ],
  },
  hata_hideg: {
    label: "háta közepén hideg futott végig",
    patterns: [/h[áa]ta\s+k[öo]zep[ée]n\s+hideg/gi, /h[áa]tam\s+k[öo]zep[ée]n\s+hideg/gi],
    alternatives: [
      "tarkóján bizsergés indult",
      "összerándult egy láthatatlan érintéstől",
      "valami régi félelem költözött a vállai közé",
    ],
  },
  tenyere_verejtek: {
    label: "tenyere verejtékezni kezdett",
    patterns: [/teny[ée]re\s+verejt[ée]kezni/gi, /teny[ée]rem\s+verejt[ée]kezni/gi],
    alternatives: [
      "az ujjai megcsúsztak a fémen",
      "nedves nyomot hagyott a poháron",
      "az ujjpercei elfehéredtek a szorítástól",
    ],
  },
  hangja_suttogas: {
    label: "hangja alig volt több suttogásnál",
    patterns: [
      /hangja\s+alig\s+volt\s+t[öo]bb\s+(suttog[áa]sn[áa]l|lehelet[ée]n[ée]l)/gi,
      /hangom\s+alig\s+volt\s+t[öo]bb\s+(suttog[áa]sn[áa]l|lehelet[ée]n[ée]l)/gi,
    ],
    alternatives: [
      "a szavak megakadtak a torkán",
      "csak egy reszelős félmondat jött ki",
      "olyan halkan szólt, hogy a szellő is elnyomta",
    ],
  },
  gyomra_osszeszorult: {
    label: "gyomra összeszorult / görcsbe rándult",
    patterns: [
      /gyomra\s+[öo]ssze\s*szorult/gi,
      /gyomra\s+g[öo]rcsbe\s+r[áa]ndult/gi,
      /gyomrom\s+[öo]ssze\s*szorult/gi,
    ],
    alternatives: [
      "savas íz tört fel a torkába",
      "egy ismerős, hideg súly telepedett a köldöke alá",
      "az utolsó falat is megakadt benne",
    ],
  },
  szive_torkaban: {
    label: "szíve a torkában dobogott",
    patterns: [/sz[íi]ve\s+a\s+tork[áa]ban\s+(dobogott|l[üu]ktet[ée]tt)/gi],
    alternatives: [
      "kalapálni kezdett valami a kulcscsontja mögött",
      "olyan hangosan vert, hogy attól félt, meghallják",
      "a saját pulzusa zavarta össze",
    ],
  },
};

export const PER_BOOK_LIMIT = 3;
export const PER_CHAPTER_LIMIT = 1;

/**
 * Count cliché occurrences in a text.
 */
export function countCliches(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [key, def] of Object.entries(TRACKED_CLICHES)) {
    let total = 0;
    for (const re of def.patterns) {
      const m = text.match(re);
      if (m) total += m.length;
    }
    if (total > 0) counts[key] = total;
  }
  return counts;
}

/**
 * Merge two cliché-count maps.
 */
export function mergeClicheCounts(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = (out[k] || 0) + v;
  }
  return out;
}

/**
 * Build the "do not use" prompt block for the next generation, listing already-overused clichés.
 */
export function buildClicheBlocklistPrompt(bookCounts: Record<string, number>): string {
  const exhausted: string[] = [];
  const warning: string[] = [];
  for (const [key, def] of Object.entries(TRACKED_CLICHES)) {
    const count = bookCounts[key] || 0;
    if (count >= PER_BOOK_LIMIT) {
      exhausted.push(`• "${def.label}" — már ${count}× szerepelt, TILOS újra!`);
    } else if (count > 0) {
      warning.push(`• "${def.label}" — már ${count}× szerepelt, lehetőleg kerüld.`);
    }
  }
  if (exhausted.length === 0 && warning.length === 0) {
    return `\n\n## KLISÉ-LIMIT (testi reakciók):
- A teljes könyvben MAX 3× használhatók a kővetkezők: "torka kiszáradt", "mellkasa összeszorult", "vér a fülében dübörgött", "háta közepén hideg futott végig", "tenyere verejtékezni kezdett", "hangja alig volt több suttogásnál", "gyomra összeszorult", "szíve a torkában dobogott".
- Egy jelenetben MAX 1× szerepelhet bármelyik.
- Variálj, használj egyedi testi/érzéki reakciókat helyettük!`;
  }
  return `\n\n## KLISÉ-LIMIT (testi reakciók) — KÖTELEZŐ TILTÁS:
${exhausted.length > 0 ? `\n### TILTOTT (a könyvben már elérte a limitet):\n${exhausted.join("\n")}` : ""}
${warning.length > 0 ? `\n### KORLÁTOZOTT (kerüld!):\n${warning.join("\n")}` : ""}

Ha mégis testi reakciót akarsz írni, találj ki EGYEDI, KÖRÜLÍRÓ alternatívát (pl. "egy ismerős hideg súly telepedett a köldöke alá", "saját pulzusát hallotta a csendben"). NE használd a tiltott listán szereplő kifejezéseket!`;
}

/**
 * Build a lector instruction for replacing already-counted overused clichés in a single scene.
 */
export function buildClicheLectorInstruction(
  sceneCounts: Record<string, number>,
  bookCounts: Record<string, number>
): string {
  const overflow: Array<{ label: string; alternatives: string[]; count: number }> = [];
  for (const [key, count] of Object.entries(sceneCounts)) {
    const def = TRACKED_CLICHES[key];
    if (!def) continue;
    const bookTotal = (bookCounts[key] || 0) + count;
    if (count > PER_CHAPTER_LIMIT || bookTotal > PER_BOOK_LIMIT) {
      overflow.push({ label: def.label, alternatives: def.alternatives, count });
    }
  }
  if (overflow.length === 0) return "";
  return `\n\n## KLISÉ-CSERE (KÖTELEZŐ!):
Az alábbi kifejezések túllépték a megengedett gyakoriságot a jelenetben/könyvben. KÖTELEZŐ kicserélned az ÖSSZES (kivéve max 1) előfordulást másra:

${overflow
  .map(
    (o) =>
      `- "${o.label}" (${o.count}× a jelenetben). Lehetséges helyettesítők: ${o.alternatives
        .map((a) => `"${a}"`)
        .join(" / ")}. Vagy találj ki egyedi alternatívát.`
  )
  .join("\n")}
`;
}