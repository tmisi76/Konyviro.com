
# Export Javítás - MEGOLDVA ✅

## Probléma

A háttérben írt könyvek tartalma a `chapters.content` mezőben tárolódik (az `append_chapter_content` RPC-n keresztül), de az export rendszerek (kliens és szerver) csak a `blocks` táblából olvastak.

## Megoldás

### 1. `supabase/functions/export-book/index.ts` - Javítva
- A fejezetek lekérésekor most már a `content` mezőt is lekérjük
- Ha a blocks táblában nincs tartalom, akkor a `chapters.content`-ből olvassuk
- A tartalom HTML-re konvertálódik

### 2. `src/pages/ProjectExport.tsx` - Javítva
- Ugyanaz a logika: prioritás a blocks táblának, de fallback a `chapters.content`-re

## Összefoglalás

Az export most már helyesen kezeli mindkét tartalomforrást:
1. **Blocks tábla** (prioritás) - felhasználó által szerkesztett tartalom
2. **Chapters.content** (fallback) - háttérben generált tartalom

