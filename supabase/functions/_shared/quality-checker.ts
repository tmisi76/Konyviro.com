/**
 * Quality checker for AI-generated scene/section content.
 * Validates word count, paragraph structure, markdown remnants, and more.
 */

export interface QualityResult {
  passed: boolean;
  issues: string[];
  wordCount: number;
  wordCountRatio: number; // actual / target
  shouldRetry: boolean; // if true, the engine should retry with reinforced prompt
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
  const retryReasons: string[] = [];
  const wordCount = countWords(content);
  const wordCountRatio = wordCount / Math.max(targetWords, 1);

  // 1. Word count check - at least 50% of target
  if (targetWords > 200 && wordCountRatio < 0.5) {
    issues.push(`Túl rövid: ${wordCount}/${targetWords} szó (${Math.round(wordCountRatio * 100)}%)`);
    retryReasons.push(`A szöveg túl rövid (${wordCount} szó a célzott ${targetWords} helyett). Írj LÉNYEGESEN hosszabb, részletesebb jelenetet!`);
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
    retryReasons.push("NE kezdd meta-kommentárral (pl. 'Itt van a jelenet'). Kezdd KÖZVETLENÜL a jelenet szövegével — narráció, párbeszéd vagy cselekvés!");
  }

  // 6. Summary-style detection: sentences starting with temporal connectors
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const summaryStarters = /^\s*(aztán|ezután|később|végül|végére|ezt követően|másnap|a következő|idővel|hamarosan|nemsokára|miután)/i;
  const summaryCount = sentences.filter(s => summaryStarters.test(s)).length;
  const summaryRatio = summaryCount / Math.max(sentences.length, 1);
  if (sentences.length > 5 && summaryRatio > 0.3) {
    issues.push(`Összefoglaló-stílus: ${Math.round(summaryRatio * 100)}% mondatkezdés időugrással (aztán, később, ezután...)`);
    retryReasons.push("A szöveg összefoglaló stílusú — túl sok 'aztán', 'később', 'ezután' mondatkezdés. DRAMATIZÁLJ valós időben: párbeszéddel, cselekvéssel, érzékszervi részletekkel!");
  }

  // 7. Dialogue tag repetition: "mondta" overuse
  const mondtaMatches = content.match(/\bmondta\b/gi) || [];
  const mondtaPer1000 = (mondtaMatches.length / Math.max(wordCount, 1)) * 1000;
  if (mondtaMatches.length > 5 && mondtaPer1000 > 5) {
    issues.push(`Párbeszéd-tag ismétlődés: "mondta" ${mondtaMatches.length}x (${mondtaPer1000.toFixed(1)}/1000 szó)`);
    retryReasons.push(`A "mondta" szó ${mondtaMatches.length}-szer szerepel. Használj változatos tageket: suttogta, morogta, vetette oda, jegyezte meg — vagy akció-tageket: "Megdörzsölte a szemét. – Nem alszom eleget."`);
  }

  const shouldRetry = retryReasons.length > 0;

  return {
    passed: issues.length === 0,
    issues,
    wordCount,
    wordCountRatio,
    shouldRetry,
  };
}

/**
 * Build a reinforced retry prompt based on quality issues.
 */
export function buildQualityRetryPrompt(issues: string[]): string {
  return `

--- MINŐSÉGI JAVÍTÁSI UTASÍTÁSOK (ELŐZŐ PRÓBÁLKOZÁS HIBÁI) ---
Az előző generálás az alábbi minőségi problémákat tartalmazta. Kérlek javítsd:

${issues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}

FONTOS: Ezúttal KÜLÖNÖSEN ügyelj a fenti problémák elkerülésére!
--- JAVÍTÁSI UTASÍTÁSOK VÉGE ---`;
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
    .replace(/`([^`]+)`/g, '$1')
    // Strip technical metadata lines that AI echoes back from prompts
    .replace(/^(FEJEZET|JELENET|MŰFAJ|KONTEXTUS|CONTEXT|KÖNYV MŰFAJA|JELENET SORSZÁMA|FEJEZET CÍME|SZEKCIÓ SORSZÁMA|SZEKCIÓ CÍME|POV KARAKTER|HELYSZÍN|IDŐ|HOSSZ|HANGNEM|ÍRÁSI FELADAT|CÉLHOSSZ|KULCSESEMÉNYEK|ÉRZELMI ÍV|KARAKTER INFORMÁCIÓK|ELŐZMÉNYEK|ELŐZŐ SZÖVEGRÉSZ|JELENET FELADAT|JELENET DRAMATURGIÁJA|TÖRTÉNETI ÍV POZÍCIÓ|FESZÜLTSÉG SZINTJE|FORMÁZÁSI KÖVETELMÉNYEK|KÖNYV HANGNEME|KÖNYV CÉLKÖZÖNSÉGE|KÖNYV ALAPTÖRTÉNETE|SZEKCIÓ TÍPUSA|SZEKCIÓ CÉLJA|FELADAT|KULCSPONTOK|MEGSZÓLÍTÁS|KUTATÁSI ANYAGOK|ELŐZŐ FEJEZETEK|CSAK a jelenet|CSAK a szekció):.*$/gm, '')
    // Strip lines that are just "---" separators from prompt structure
    .replace(/^-{3,}$/gm, '')
    // Clean up resulting multiple empty lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
