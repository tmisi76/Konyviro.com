/**
 * Normalize book content: convert plain text or mixed content into clean HTML paragraphs.
 */
export function contentToHtml(content: string | null): string {
  if (!content) return "<p>Nincs tartalom.</p>";
  // If already HTML with paragraphs, use as-is
  if (content.includes("<p>") || content.includes("<p ")) return content;
  // Convert plain text to HTML paragraphs
  return content
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join("\n");
}

/**
 * Extract plain text paragraphs from content (HTML or plain text).
 * Returns array of paragraph strings (no HTML tags).
 */
export function contentToParagraphs(content: string | null): string[] {
  if (!content) return [];

  // Strip HTML tags if present
  let text = content;
  if (text.includes("<p>") || text.includes("<p ") || text.includes("<br")) {
    // Replace </p><p> and <br> with newlines, then strip remaining tags
    text = text
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "");
  }

  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}
