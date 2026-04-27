/**
 * Post-hoc character name consistency validator.
 * After scene generation, extracts proper-noun candidates from the prose and
 * compares them to the project's authoritative character registry.
 * If a near-match (Levenshtein <= 2) is detected for an unknown name, it auto-corrects
 * the prose to the registered name so the AI can't drift (Kaelis → Kael, etc).
 */

import { extractCandidateCharacterNames } from "./prompt-builder.ts";

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const v0 = new Array(bl + 1);
  const v1 = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) v0[j] = j;
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a[i].toLowerCase() === b[j].toLowerCase() ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }
  return v1[bl];
}

export interface NameConsistencyResult {
  /** Corrected text (or unchanged if nothing to fix). */
  text: string;
  /** Mapping of "wrong → right" pairs that were applied. */
  corrections: Record<string, string>;
  /** Unknown candidate names that did not match any registered character. */
  unmatched: string[];
}

/**
 * Build a quick lookup of registered names (and first-name tokens of multi-word names).
 */
function buildRegistry(names: string[]): Set<string> {
  const reg = new Set<string>();
  for (const n of names) {
    if (!n) continue;
    const trimmed = n.trim();
    if (!trimmed) continue;
    reg.add(trimmed);
    const parts = trimmed.split(/\s+/);
    for (const p of parts) {
      if (p.length >= 3) reg.add(p);
    }
  }
  return reg;
}

/**
 * Replace whole-word occurrences of `from` with `to` (case-sensitive on first letter).
 */
function replaceWholeWord(text: string, from: string, to: string): string {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "g");
  return text.replace(re, to);
}

/**
 * Validate names in generated text against an authoritative registry.
 * If an extracted candidate name is NOT in the registry but is within Levenshtein distance 2
 * of a registered name, replace it. Otherwise just record it as unmatched (e.g. new minor character).
 */
export function validateAndFixCharacterNames(
  text: string,
  registeredNames: string[]
): NameConsistencyResult {
  if (!text || !registeredNames || registeredNames.length === 0) {
    return { text, corrections: {}, unmatched: [] };
  }

  const candidates = extractCandidateCharacterNames(text);
  const registry = buildRegistry(registeredNames);
  const corrections: Record<string, string> = {};
  const unmatched: string[] = [];
  let fixed = text;

  for (const candidate of candidates) {
    if (registry.has(candidate)) continue; // exact known name, OK
    // Try first-token match
    const firstToken = candidate.split(/\s+/)[0];
    if (registry.has(firstToken)) continue;

    // Look for closest registered name (single tokens only — multi-word matches are too risky)
    let best: { name: string; distance: number } | null = null;
    for (const reg of registry) {
      // Only compare to single-token registry entries to avoid replacing partials of "Lánczos Viktor"
      if (reg.includes(" ")) continue;
      // Only compare if lengths are similar (avoid Anna ↔ Annamária collisions)
      if (Math.abs(reg.length - firstToken.length) > 2) continue;
      const d = levenshtein(reg, firstToken);
      if (d > 0 && d <= 2 && (!best || d < best.distance)) {
        best = { name: reg, distance: d };
      }
    }
    if (best) {
      // Don't apply auto-correction if the candidate is already very common in the text
      // (could be a legitimate new minor character).
      const occurrences = (text.match(new RegExp(`\\b${firstToken}\\b`, "g")) || []).length;
      if (occurrences <= 8) {
        fixed = replaceWholeWord(fixed, firstToken, best.name);
        corrections[firstToken] = best.name;
      } else {
        unmatched.push(candidate);
      }
    } else {
      unmatched.push(candidate);
    }
  }

  return { text: fixed, corrections, unmatched };
}

/**
 * Strip duplicated chapter title that may appear as an internal heading inside the prose.
 * The AI sometimes echoes the chapter title as a section header (e.g. "Törött üvegek" appearing
 * mid-chapter). This removes any standalone line that exactly (or near-exactly) matches the title.
 */
export function stripChapterTitleDupes(content: string, chapterTitle: string | null | undefined): string {
  if (!content || !chapterTitle) return content;
  const title = chapterTitle.trim();
  if (title.length < 3) return content;
  const titleLower = title.toLowerCase();

  const lines = content.split("\n");
  const cleaned: string[] = [];
  let removedFirst = false; // allow the title at the very top (rare), but strip any later occurrence

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const trimmedLower = trimmed.toLowerCase().replace(/[„""'.!?:]/g, "");
    const titleNorm = titleLower.replace(/[„""'.!?:]/g, "");

    // Match if the line is just the title (or title with leading/trailing punctuation)
    if (trimmed.length > 0 && trimmedLower === titleNorm) {
      // Skip duplicates after the very first occurrence
      if (i === 0 && !removedFirst) {
        cleaned.push(line);
        removedFirst = true;
      }
      continue;
    }
    cleaned.push(line);
  }

  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}