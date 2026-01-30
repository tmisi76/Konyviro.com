
# Lektorálás Javítási Terv

## Azonosított Problémák

### 1. JSON Parse Hiba a Model Lekérésnél
A `proofread-chapter` és `process-proofreading` edge function-ökben a `getProofreadingModel` függvény hibásan próbálja JSON-ként parse-olni a model stringet, ami már eleve string formátumban van az adatbázisban.

**Hiba log:**
```
Error fetching proofreading model: SyntaxError: Unexpected token 'g', "google/gem"... is not valid JSON
```

### 2. Fejezet Lektorálás - Editor Nem Frissül Megfelelően
Bár a `onRefreshChapter` hívódik, a `fetchBlocks` függvény logikája problémás:
- Ha a chapter-ben van content ÉS nincsenek "valódi tartalommal rendelkező" blokkok → újrakonvertálja
- DE ha már vannak blokkok (a korábbi szövegből) → nem frissülnek, mert a régi blokkok "valódi tartalomnak" számítanak

### 3. Teljes Könyv Lektorálás - Editor Nem Értesül
A `useProofreading` hook `queryClient.invalidateQueries()`-t használ, de a `useEditorData` hook **useState**-et használ, nem React Query-t. Ez azt jelenti, hogy a cache invalidálás hatástalan.

## Javítási Terv

### 1. Edge Function JSON Parse Fix

**Fájlok:** 
- `supabase/functions/proofread-chapter/index.ts`
- `supabase/functions/process-proofreading/index.ts`

**Változtatás:**
```typescript
// ELŐTTE (hibás):
const model = typeof value === "string" ? JSON.parse(value) : value;

// UTÁNA (javítva):
const model = typeof value === "string" ? value : String(value);
```

### 2. Blokk Frissítés Lektorálás Után

**Fájl:** `src/hooks/useEditorData.ts`

A `fetchBlocks` függvény jelenleg csak akkor konvertálja újra a content-et blokkokká, ha nincsenek "valódi" blokkok. Lektorálás után a régiek megmaradnak.

**Megoldás:** Új `forceRefreshBlocks` függvény hozzáadása, ami:
1. Törli a meglévő blokkokat
2. Újrakonvertálja a chapter.content-et blokkokká

### 3. Teljes Könyv Lektorálás Frissítés

**Fájl:** `src/hooks/useProofreading.ts`

A status change figyelésnél (156-185 sorok) hozzáadni egy callback-et a `useEditorData` frissítéséhez.

**Vagy:** A Dashboard-ról navigál vissza a felhasználó, ezért az editor úgyis újratölt.

### 4. Dialog "Bezárás" Gomb - Auto Frissítés

**Fájl:** `src/components/editor/ChapterSidebar.tsx`

A "Bezárás" gomb megnyomásakor (lektorálás után) is frissíteni kell az adatokat.

## Technikai Változtatások

| Fájl | Változtatás |
|------|-------------|
| `supabase/functions/proofread-chapter/index.ts` | JSON parse fix |
| `supabase/functions/process-proofreading/index.ts` | JSON parse fix |
| `src/hooks/useEditorData.ts` | `forceRefreshBlocks(chapterId)` függvény |
| `src/components/editor/ChapterSidebar.tsx` | Bezárásnál is refresh |

## Implementációs Részletek

### Edge Function Fix
```typescript
// getProofreadingModel függvényben:
async function getProofreadingModel(supabaseAdmin: any): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "ai_proofreading_model")
      .single();

    if (error || !data) {
      return DEFAULT_PROOFREADING_MODEL;
    }

    // FIX: A value lehet JSON string VAGY sima string
    let modelValue = data.value;
    if (typeof modelValue === "string") {
      // Próbáljuk JSON-ként parse-olni, de ha nem sikerül, használjuk sima stringként
      try {
        modelValue = JSON.parse(modelValue);
      } catch {
        // Már sima string, használjuk közvetlenül
      }
    }
    return modelValue || DEFAULT_PROOFREADING_MODEL;
  } catch (err) {
    console.error("Error fetching proofreading model:", err);
    return DEFAULT_PROOFREADING_MODEL;
  }
}
```

### useEditorData Bővítés
```typescript
// Új függvény a fejezet blokkjainak kényszerített újratöltésére
const forceRefreshBlocks = useCallback(async (chapterId: string) => {
  if (!chapterId) return;
  
  // 1. Töröljük a meglévő blokkokat
  await supabase.from("blocks").delete().eq("chapter_id", chapterId);
  
  // 2. Lekérjük a friss chapter content-et
  const { data: chapterData } = await supabase
    .from("chapters")
    .select("content")
    .eq("id", chapterId)
    .single();
  
  if (!chapterData?.content) {
    setBlocks([]);
    return;
  }
  
  // 3. Újrakonvertáljuk blokkokká
  const paragraphs = chapterData.content.split('\n\n').filter((p: string) => p.trim());
  const newBlocks: Block[] = [];
  
  for (let i = 0; i < paragraphs.length; i++) {
    const { data: block } = await supabase
      .from("blocks")
      .insert({
        chapter_id: chapterId,
        type: 'paragraph',
        content: paragraphs[i].trim(),
        sort_order: i,
      })
      .select()
      .single();
    
    if (block) {
      newBlocks.push(block as Block);
    }
  }
  
  setBlocks(newBlocks);
}, []);

// Return-ben exportálni:
return {
  // ... existing
  forceRefreshBlocks,
};
```

### ChapterSidebar Frissítés
```typescript
const handleCloseProofreadingDialog = async () => {
  if (!isProofreading) {
    // Ha volt lektorálás (streamedContent van), frissítjük az adatokat
    if (streamedContent && onRefreshChapter) {
      await onRefreshChapter();
    }
    setProofreadingChapter(null);
    reset();
  }
};
```

## Tesztelési Lépések

1. **Fejezet Lektorálás:**
   - Nyiss meg egy projektet a szerkesztőben
   - Jobb klikk egy fejezeten → "Fejezet lektorálása"
   - Várd meg a stream befejezését
   - Klikkelj "Bezárás"
   - Ellenőrizd: a fejezet szövege frissült az editorban

2. **Teljes Könyv Lektorálás:**
   - Menj a "Lektorálás" fülre
   - Indítsd el a teljes könyv lektorálást
   - Várj a befejezésre a Dashboard-on
   - Menj vissza a szerkesztőbe
   - Ellenőrizd: minden fejezet szövege frissült
