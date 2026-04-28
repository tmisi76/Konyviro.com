// Dynamic [body-part] + [verb] bigram tracker.
// Catches mutating clichés like "nyaki ütőerén megrebbent a bőr" repeated dozens of times.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BODY_PARTS = [
  "nyak", "mellkas", "gyomor", "torok", "halánték", "tarkó", "kéz",
  "ujj", "láb", "térd", "váll", "hát", "fej", "szem", "száj", "ajak",
  "ajka", "fül", "tüdő", "bőr", "vér", "szív", "homlok", "arca", "arc",
  "hasa", "has", "csípő", "comb", "köldök", "ütőér", "véredény",
];

const REACTION_VERBS = [
  "megrebben", "megrebbent", "kifeszül", "kifeszült", "összeszorul",
  "összeszorult", "lüktet", "lüktetett", "dübörög", "dübörgött",
  "elgyengül", "elgyengült", "belesüpped", "belesüppedt", "megreszket",
  "megreszketett", "kiszárad", "kiszáradt", "görcsöl", "görcsölt",
  "megremeg", "megremegett", "megfeszül", "megfeszült", "elsápad",
  "elsápadt", "elpirul", "elpirult", "izzad", "izzadt", "fagy",
  "megfagyott", "elkezdett", "remegni", "vibrál", "vibrált",
];

const BODY_RE = new RegExp(`\\b(${BODY_PARTS.join("|")})\\w*\\b`, "gi");
const VERB_RE = new RegExp(`\\b(${REACTION_VERBS.join("|")})\\b`, "i");

const WINDOW_TOKENS = 5; // body-part and verb within 5 tokens of each other

/**
 * Extract [body-part]+[verb] bigrams from a piece of text.
 * Returns a map { "nyak megrebben": 3, ... }
 */
export function extractBigrams(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  const tokens = text.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i].toLowerCase();
    const bm = tok.match(BODY_RE);
    if (!bm) continue;
    const bodyRoot = bm[0].toLowerCase();
    // Look ahead WINDOW_TOKENS tokens for a reaction verb
    for (let j = i + 1; j <= Math.min(tokens.length - 1, i + WINDOW_TOKENS); j++) {
      const next = tokens[j].toLowerCase().replace(/[.,;:!?„”"'()]/g, "");
      if (VERB_RE.test(next)) {
        const verbRoot = next.match(VERB_RE)?.[1] ?? next;
        const key = `${bodyRoot}+${verbRoot}`;
        counts[key] = (counts[key] ?? 0) + 1;
        break;
      }
    }
  }
  return counts;
}

/**
 * Merge new bigram counts into the project-wide store.
 */
export function mergeBigrams(
  existing: Record<string, number>,
  next: Record<string, number>
): Record<string, number> {
  const out = { ...existing };
  for (const [k, v] of Object.entries(next)) {
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

export const BIGRAM_WARN_THRESHOLD = 4;
export const BIGRAM_RETRY_THRESHOLD = 6;

/**
 * Build a system-prompt snippet that lists banned bigrams for the next scene.
 */
export function buildBigramAvoidanceInstruction(
  totals: Record<string, number>
): string {
  const overused = Object.entries(totals)
    .filter(([, n]) => n >= BIGRAM_WARN_THRESHOLD)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12);
  if (overused.length === 0) return "";
  const lines = overused.map(([k, n]) => {
    const [body, verb] = k.split("+");
    return `- "${body} … ${verb}" (eddig ${n}×)`;
  });
  return [
    "TILTOTT TESTI-REAKCIÓ KLISÉK (a könyvben már túl gyakoriak):",
    ...lines,
    "Találj ki teljesen MÁS testi reakciókat. Tilos a fenti testrész+ige párokat újra használni ebben a jelenetben.",
  ].join("\n");
}

/**
 * Persist updated bigram counts on the project row.
 */
export async function persistBigrams(
  projectId: string,
  totals: Record<string, number>
): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  const supabase = createClient(url, key);
  await supabase.from("projects").update({ bigram_counts: totals }).eq("id", projectId);
}

export async function loadBigrams(projectId: string): Promise<Record<string, number>> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return {};
  const supabase = createClient(url, key);
  const { data } = await supabase
    .from("projects")
    .select("bigram_counts")
    .eq("id", projectId)
    .maybeSingle();
  return (data?.bigram_counts as Record<string, number>) ?? {};
}
