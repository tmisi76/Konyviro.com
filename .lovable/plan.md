
# Javítási terv: Üres blokkok kezelése a szerkesztőben

## Probléma azonosítása

Az adatbázisban:
- **7 fejezet van** teljes tartalommal (`chapters.content` - 11-17k karakter)
- **3 fejezetnek van 1 üres blokk** (`content_length: 0`)
- **4 fejezetnek nincs blokkja** (ezek helyesen fognak működni)

A jelenlegi logika:
```typescript
if (!blocksData || blocksData.length === 0) {
  // Konvertálás...
}
```

Ez **nem működik** ha van 1 üres blokk - ilyenkor a kód azt hiszi, minden rendben van.

## Megoldás

### 1. `src/hooks/useEditorData.ts` - Logika javítása

A feltételt bővíteni kell: ha a blokkok **mind üresek**, akkor is konvertálni kell a `chapters.content`-et.

```typescript
// Fetch blocks for active chapter - converts chapter.content to blocks if needed
const fetchBlocks = useCallback(async () => {
  if (!activeChapterId) return;

  const { data: blocksData, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("chapter_id", activeChapterId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching blocks:", error);
    return;
  }

  // Ellenőrizzük, hogy vannak-e valódi tartalommal rendelkező blokkok
  const hasRealContent = blocksData && blocksData.some(
    block => block.content && block.content.trim().length > 0
  );

  // Ha nincsenek blokkok VAGY mind üresek, nézzük meg van-e chapter.content
  if (!blocksData || blocksData.length === 0 || !hasRealContent) {
    // Lekérjük a chapter content-et közvetlenül
    const { data: chapterData } = await supabase
      .from("chapters")
      .select("content")
      .eq("id", activeChapterId)
      .maybeSingle();
    
    if (chapterData?.content && chapterData.content.trim().length > 0) {
      // Töröljük a meglévő üres blokkokat
      if (blocksData && blocksData.length > 0) {
        for (const block of blocksData) {
          await supabase.from("blocks").delete().eq("id", block.id);
        }
      }
      
      // Van content - konvertáljuk blokkokká
      const paragraphs = chapterData.content.split('\n\n').filter(p => p.trim());
      
      const newBlocks = [];
      for (let i = 0; i < paragraphs.length; i++) {
        const { data: block } = await supabase
          .from("blocks")
          .insert({
            chapter_id: activeChapterId,
            type: 'paragraph',
            content: paragraphs[i].trim(),
            sort_order: i,
          })
          .select()
          .single();
        
        if (block) {
          newBlocks.push({
            ...block,
            type: block.type as BlockType,
            metadata: {}
          });
        }
      }
      
      setBlocks(newBlocks);
      if (newBlocks.length > 0) {
        toast.success("Fejezet tartalom betöltve a szerkesztőbe");
      }
      return;
    }
    
    // Ha nincs content sem, üres blokk létrehozása (ha még nincs)
    if (!blocksData || blocksData.length === 0) {
      const newBlock = await createBlock("paragraph", "", 0);
      if (newBlock) {
        setBlocks([newBlock]);
      }
    } else {
      // Megjelenítjük a létező üres blokkokat
      const typedData = blocksData.map(block => ({
        ...block,
        type: block.type as BlockType,
        metadata: (block.metadata || {}) as Block['metadata']
      }));
      setBlocks(typedData);
    }
    return;
  }

  // Normál eset - vannak valódi tartalmú blokkok
  const typedData = blocksData.map(block => ({
    ...block,
    type: block.type as BlockType,
    metadata: (block.metadata || {}) as Block['metadata']
  }));

  setBlocks(typedData);
}, [activeChapterId]);
```

## Működési folyamat a javítás után

```
Fejezet megnyitása
    ↓
Blokkok lekérése
    ↓
Van blokk?
    ├── Van valódi tartalmú blokk? → Megjelenítés ✅
    └── Mind üres? → chapters.content ellenőrzése
                        ├── Van content? → Üres blokkok törlése
                        │                  → Content konvertálása blokkokká ✅
                        └── Nincs content? → Üres blokk marad
```

## Összefoglaló

| Módosítás | Fájl |
|-----------|------|
| Üres blokkok detektálása | `src/hooks/useEditorData.ts` |
| Üres blokkok törlése konverzió előtt | `src/hooks/useEditorData.ts` |
| `hasRealContent` ellenőrzés | `src/hooks/useEditorData.ts` |
