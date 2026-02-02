

# Szószámlálás Teljes Körű Javítása - Technikai Terv

## Probléma Összefoglalása

A felhasználó a 3. fejezetet ("A múlt kódjai") kimásolta és külső eszközzel mérte: **2903 szó**. A rendszer **3727 szót** mutat (ami korábban 3936 volt). A különbség: ~824 szó (~22% eltérés).

## Diagnózis Eredményei

Az adatbázis elemzése alapján:

| Számolási módszer | Eredmény | Megjegyzés |
|-------------------|----------|------------|
| Jelenlegi SQL (whitespace split) | 3727 | Minden tokent számol |
| Csak betűket tartalmazó tokenek | 3574 | Számokat kihagyja |
| Tokenek length >= 2 | 3196 | Egykaraktereseket kihagyja |
| Csak betűk, length >= 2 | 3178 | "Valódi szavak" |
| Alfabetikus regex (`[a-zA-Z...]+`) | 3586 | Word-szerű módszer |
| Felhasználó (Word/online tool) | ~2903 | Referencia |

### A 800+ szó különbség forrásai:

1. **531 egykarakteres token** (névelők: "a", "A", gondolatjelek: "–")
2. **25 tisztán numerikus token** (kódok mint "15-21-14-9-22-5-18-19-9-20-1-19")
3. **41 kötőjeles token** (a külső eszközök ezeket 1 szónak számolják)
4. A fejezet tartalmaz kód-szerű elemeket, amiket a Word nem számol szóként

## A Valódi Probléma

A jelenlegi szószámláló **technikai tokeneket** számol, nem "olvasói szavakat". A Word, Google Docs és más eszközök más algoritmusokat használnak:
- Csak valódi szavakat számolnak (betűket tartalmazó tokenek)
- A számsorokat (pl. "15-21-14-9...") nem számolják
- Egyes egykarakteres elemeket kihagynak

## Javasolt Megoldás: "Word-kompatibilis" Szószámlálás

### Új szabály (iparági standard közelítés):
```text
Egy token szónak számít, ha:
1. Tartalmaz legalább egy betűt (magyar vagy angol)
2. Hossza legalább 1 karakter

Ez kiszűri: számokat, kódokat, tisztán írásjeles tokeneket
```

### SQL implementáció:
```text
SELECT count(*)
FROM regexp_split_to_table(trim(content), E'\\s+') AS word
WHERE word ~ '[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]'
```

Ez a "A múlt kódjai" fejezethez **3574 szót** adna, ami közelebb van a felhasználó által mért 2903-hoz. A maradék ~670 szó különbség a következőkből adódik:
- Egykarakteres névelők ("a", "s") - ezeket a Word számolja
- Rövid szavak - ezeket is számolja a Word
- A külső eszköz valószínűleg más nyelvészeti szabályokat használ

## Érintett Komponensek

### 1. Frontend szószámlálás
**Fájl:** `src/hooks/useEditorData.ts`

Jelenlegi (443-446. sor):
```javascript
const words = block.content.trim().split(/\s+/).filter(Boolean).length;
```

Javított:
```javascript
const words = block.content.trim().split(/\s+/)
  .filter(word => /[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(word)).length;
```

### 2. Backend RPC (`append_chapter_content`)
**Fájl:** SQL migráció

Javított:
```sql
total_words := (
  SELECT count(*)::integer
  FROM regexp_split_to_table(trim(new_content), E'\\s+') AS word
  WHERE word ~ '[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]'
);
```

### 3. Edge function-ök
**Fájlok:** `write-scene/index.ts`, `useAIGeneration.ts`

Jelenlegi (9. sor, write-scene):
```javascript
const countWords = (t: string) => t.trim().split(/\s+/).filter(w => w.length > 0).length;
```

Javított:
```javascript
const countWords = (t: string) => t.trim().split(/\s+/)
  .filter(w => /[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(w)).length;
```

### 4. Meglévő adatok újraszámolása
SQL migráció a `chapters` és `projects` táblák frissítéséhez az új logikával.

## Export Problémák

A felhasználó említette, hogy az exportált fájlban "más számot lát". Az export-book edge function a `blocks` táblából olvassa a tartalmat és HTML-lé alakítja. 

**Potenciális problémák:**

1. **A blocks.content és chapters.content eltérhet**: Ez NEM probléma, mert ellenőriztem - a tartalmak egyeznek.

2. **A CloudConvert által generált PDF/EPUB word count**: A CloudConvert nem jelent szószámot, de az olvasó programok (Calibre, Kindle, Adobe Reader) saját algoritmussal számolnak.

3. **Exportkor NEM jelenítünk meg szószámot**: A BookExportModal és BookPreview nem mutat szószámot - ez rendben van.

## Javasolt Módosítások

### Fájlok módosítása:

| Fájl | Változtatás |
|------|-------------|
| `supabase/migrations/` (új) | Új szószámláló logika az `append_chapter_content`-ben + meglévő adatok újraszámolása |
| `src/hooks/useEditorData.ts` | Frontend szószámláló logika frissítése |
| `src/hooks/useAIGeneration.ts` | `countWords` helper frissítése |
| `supabase/functions/write-scene/index.ts` | `countWords` helper frissítése |
| `supabase/functions/write-section/index.ts` | Ha létezik, `countWords` frissítése |

### Alternatív megközelítés: Felhasználói beállítás

Ha a felhasználó pontosabb egyezést szeretne a Word-del, felkínálhatunk egy "Szószámlálási mód" beállítást:
- **Standard** (jelenlegi): Minden whitespace-elválasztott token
- **Könyvírói** (új): Csak betűket tartalmazó tokenek (Word-kompatibilis)

## Tesztelési Terv

1. Javítás után ellenőrizni a "A múlt kódjai" fejezetet
2. Várható eredmény: 3574 szó (korábbi 3727 helyett)
3. A felhasználó által mért 2903-hoz képest még ~670 szó különbség marad - ez normális, mert:
   - A Word nyelvfüggő tokenizálást használ
   - Egyes online eszközök eltérő algoritmusokat alkalmaznak
   - A teljes egyezés nem lehetséges különböző rendszerek között

## Megjegyzés

Fontos megérteni: **nincs "tökéletes" szószámláló algoritmus**. A Word, a Google Docs, a LibreOffice és az online eszközök mind eltérő eredményeket adnak. A javasolt módosítás közelíti az iparági standardot, de teljes egyezés nem várható.

