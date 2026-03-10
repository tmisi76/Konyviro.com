/**
 * Detects repetitive content in AI-generated text.
 * Splits text into paragraphs and checks for duplicate or near-duplicate blocks.
 */

export interface RepetitionResult {
  isRepetitive: boolean;
  score: number; // 0-1, ratio of repeated content
  cleanedText: string; // Text with repeated blocks removed
}

/**
 * Normalize text for comparison: lowercase, collapse whitespace, remove punctuation.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate similarity between two strings using character overlap ratio.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;

  if (shorter.length === 0) return 0;

  // Use substring matching for efficiency
  let matchCount = 0;
  const windowSize = Math.min(50, shorter.length);

  for (let i = 0; i <= shorter.length - windowSize; i += windowSize) {
    const chunk = shorter.substring(i, i + windowSize);
    if (longer.includes(chunk)) {
      matchCount++;
    }
  }

  const totalWindows = Math.max(1, Math.ceil(shorter.length / windowSize));
  return matchCount / totalWindows;
}

/**
 * Detect repetition in generated text.
 * @param text - The full generated text to analyze
 * @param threshold - Similarity threshold to consider paragraphs as duplicates (default 0.8)
 * @returns RepetitionResult with score and cleaned text
 */
export function detectRepetition(text: string, threshold = 0.8): RepetitionResult {
  if (!text || text.trim().length < 200) {
    return { isRepetitive: false, score: 0, cleanedText: text };
  }

  // Split into paragraphs (double newline or single newline with content)
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 30); // Only consider substantial paragraphs

  if (paragraphs.length < 3) {
    return { isRepetitive: false, score: 0, cleanedText: text };
  }

  const normalizedParagraphs = paragraphs.map(normalize);
  const seen = new Set<number>(); // Indices of duplicate paragraphs
  let duplicateCharCount = 0;
  let totalCharCount = 0;

  for (let i = 0; i < normalizedParagraphs.length; i++) {
    totalCharCount += paragraphs[i].length;

    if (seen.has(i)) continue;

    for (let j = i + 1; j < normalizedParagraphs.length; j++) {
      if (seen.has(j)) continue;

      const sim = similarity(normalizedParagraphs[i], normalizedParagraphs[j]);
      if (sim >= threshold) {
        seen.add(j);
        duplicateCharCount += paragraphs[j].length;
      }
    }
  }

  const score = totalCharCount > 0 ? duplicateCharCount / totalCharCount : 0;

  // Build cleaned text by removing duplicate paragraphs
  const cleanedParagraphs = paragraphs.filter((_, i) => !seen.has(i));
  const cleanedText = cleanedParagraphs.join("\n\n");

  return {
    isRepetitive: score > 0.3,
    score,
    cleanedText,
  };
}
