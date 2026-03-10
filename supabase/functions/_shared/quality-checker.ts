/**
 * Quality checker for AI-generated scene/section content.
 * Validates word count, paragraph structure, markdown remnants, and more.
 */

export interface QualityResult {
  passed: boolean;
  issues: string[];
  wordCount: number;
  wordCountRatio: number; // actual / target
}

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(w => /[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(w)).length;

/**
 * Check the quality of generated scene/section content.
 * Returns issues that may warrant a retry with an enhanced prompt.
 */
export function checkSceneQuality(
  content: string,
  targetWords: number,
): QualityResult {
  const issues: string[] = [];
  const wordCount = countWords(content);
  const wordCountRatio = wordCount / Math.max(targetWords, 1);

  // 1. Word count check - at least 50% of target
  if (targetWords > 200 && wordCountRatio < 0.5) {
    issues.push(`Túl rövid: ${wordCount}/${targetWords} szó (${Math.round(wordCountRatio * 100)}%)`);
  }

  // 2. Paragraph diversity - at least 3 paragraphs for 500+ word content
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 20);
  if (wordCount > 500 && paragraphs.length < 3) {
    issues.push(`Kevés bekezdés: ${paragraphs.length} (minimum 3 ajánlott 500+ szónál)`);
  }

  // 3. Markdown remnant detection
  if (/^#{1,3}\s/m.test(content)) {
    issues.push("Markdown címsor (#) maradt a szövegben");
  }
  if (/\*\*[^*]+\*\*/m.test(content) && content.match(/\*\*/g)!.length > 4) {
    issues.push("Markdown félkövér (**) formázás maradt a szövegben");
  }
  if (/^```/m.test(content)) {
    issues.push("Markdown kódblokk maradt a szövegben");
  }

  // 4. Excessively long paragraph detection (300+ words in one paragraph)
  for (const p of paragraphs) {
    const pWords = p.split(/\s+/).length;
    if (pWords > 300) {
      issues.push(`Túl hosszú bekezdés: ${pWords} szó (max 300 ajánlott)`);
      break;
    }
  }

  // 5. Content starts with meta-commentary (AI explaining what it wrote)
  const firstLine = content.trim().split('\n')[0]?.toLowerCase() || '';
  if (firstLine.startsWith('itt van') || firstLine.startsWith('az alábbiakban') ||
      firstLine.startsWith('a jelenet') || firstLine.startsWith('ime') ||
      firstLine.startsWith('íme')) {
    issues.push("A szöveg meta-kommentárral kezdődik az AI-tól");
  }

  return {
    passed: issues.length === 0,
    issues,
    wordCount,
    wordCountRatio,
  };
}

/**
 * Strip markdown formatting from generated content while preserving text.
 */
export function stripMarkdown(content: string): string {
  return content
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold markers but keep text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove italic markers but keep text
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove code blocks markers
    .replace(/^```\w*\n?/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Remove inline code markers
    .replace(/`([^`]+)`/g, '$1');
}
