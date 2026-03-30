

# Fix: Szövegtördelés és fejezetlapozás a megosztott könyvolvasóban

## Probléma

1. **Tördelés**: A fejezet `content` mezője plain text (bekezdések `\n\n`-nel elválasztva), de a reader `dangerouslySetInnerHTML`-lel jeleníti meg. A HTML figyelmen kívül hagyja a sortöréseket, ezért egyetlen tömb szöveg jelenik meg bekezdések nélkül.
2. **Lapozás**: Fejezet váltáskor a tartalom nem scrollol vissza az elejére, és a `useSharedBook` hook a `chapters` táblából a nyers `content`-et tölti be (nem a `blocks` táblából, ahol a szerkesztett tartalom van).

## Javítás

### 1. `src/pages/PublicBookReader.tsx`

**Tartalom konvertálás**: A `dangerouslySetInnerHTML`-be kerülő `content`-et feldolgozni:
- Ha a content nem tartalmaz `<p>` tag-et, a `\n\n` és `\n` karaktereknél feldarabolni és `<p>...</p>` tagekbe csomagolni
- Üres sorokat kiszűrni

```typescript
function contentToHtml(content: string | null): string {
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
```

**Scroll to top**: Fejezet váltáskor a `<main>` elemet scrollolni a tetejére (ref + useEffect).

### 2. `src/hooks/useBookShare.ts` — Blocks fallback

A `useSharedBook` hookban a fejezet tartalom lekérés bővítése: ha a `chapters.content` üres vagy hiányzik, próbálja a `blocks` tábla tartalmát is lekérni (ezek a szerkesztett blokkok):

```typescript
// After fetching chapters, enrich with blocks content
for (const chapter of chapters) {
  if (!chapter.content || !chapter.content.trim()) {
    const { data: blocks } = await supabase
      .from("blocks")
      .select("content, sort_order")
      .eq("chapter_id", chapter.id)
      .order("sort_order");
    if (blocks?.length) {
      chapter.content = blocks.map(b => b.content).filter(Boolean).join("\n\n");
    }
  }
}
```

### Összefoglalás
- **2 fájl módosítás**: `PublicBookReader.tsx` (contentToHtml helper + scroll reset), `useBookShare.ts` (blocks fallback)
- A tördelés azonnal javul mind a plain text, mind a HTML tartalomnál

