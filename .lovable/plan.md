
# Javítási terv: Dashboard és Szerkesztő hibák

## Azonosított problémák

### 1. A "completed" projektek a "Folyamatban lévő írások" szekcióban jelennek meg

**Hiba helye:** `src/pages/Dashboard.tsx` (92-97. sor)

```typescript
const activeWritingProjects = useMemo(() => {
  return projects.filter(p => 
    p.writing_status && 
    p.writing_status !== 'idle'  // ❌ Ez a 'completed'-et is beleérti!
  );
}, [projects]);
```

**Megoldás:** Szűrjük ki a `completed` és `failed` státuszokat is, és frissítsük a progress bar színét.

### 2. A szerkesztő nem jeleníti meg a generált tartalmat

**Gyökérok:** 
- Az AI a `chapters.content` TEXT mezőbe menti a teljes szöveget
- A szerkesztő a `blocks` táblából próbál olvasni
- A `blocks` tábla üres (mindössze 3 blokk van 7 fejezetre)

**Megoldás:** A szerkesztő betöltésekor ellenőrizni kell, hogy:
1. Ha van `chapters.content` de nincs `blocks` → konvertálni a tartalmat blokkokká
2. Vagy egyszerűen megjeleníteni a `content`-et egy nagy blokként

---

## Technikai változtatások

### 1. `src/pages/Dashboard.tsx` - Szűrés javítása

```typescript
// 92-97. sor módosítása
const activeWritingProjects = useMemo(() => {
  return projects.filter(p => 
    p.writing_status && 
    !['idle', 'completed', 'failed'].includes(p.writing_status)
  );
}, [projects]);
```

### 2. `src/components/dashboard/WritingStatusCard.tsx` - 100% feletti progress kezelése

A progress bar maximum 100%-ot mutasson, és zöld legyen ha kész.

```typescript
// A wordProgressPercent-et limitáljuk 100-ra
const clampedWordProgress = Math.min(wordProgressPercent, 100);

// Progress bar szín módosítása
<Progress 
  value={clampedWordProgress} 
  className={cn("h-2", progress.status === 'completed' && "bg-emerald-500")} 
/>
```

### 3. `src/hooks/useEditorData.ts` - Chapter content konvertálása blokkokká

Új logika a `fetchBlocks` függvényben:

```typescript
const fetchBlocks = useCallback(async () => {
  if (!activeChapterId) return;

  // Először lekérjük a blokkokat
  const { data: blocksData, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("chapter_id", activeChapterId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching blocks:", error);
    return;
  }

  // Ha nincs blokk, nézzük meg van-e chapter.content
  if (!blocksData || blocksData.length === 0) {
    const chapter = chapters.find(c => c.id === activeChapterId);
    
    // Lekérjük a chapter content-et közvetlenül
    const { data: chapterData } = await supabase
      .from("chapters")
      .select("content")
      .eq("id", activeChapterId)
      .single();
    
    if (chapterData?.content && chapterData.content.trim().length > 0) {
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
      toast.success("Fejezet tartalom betöltve a szerkesztőbe");
      return;
    }
    
    // Ha nincs content sem, üres blokk
    await createBlock("paragraph", "", 0);
    return;
  }

  // Normál eset - vannak blokkok
  const typedData = blocksData.map(block => ({
    ...block,
    type: block.type as BlockType,
    metadata: (block.metadata || {}) as Block['metadata']
  }));

  setBlocks(typedData);
}, [activeChapterId, chapters]);
```

### 4. `src/types/editor.ts` - Chapter interface frissítése

```typescript
export interface Chapter {
  id: string;
  project_id: string;
  title: string;
  status: ChapterStatus;
  summary: string | null;
  key_points: string[];
  word_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  content?: string | null; // ← ÚJ: AI generált tartalom
}
```

---

## Összefoglaló

| Fájl | Változtatás |
|------|-------------|
| `src/pages/Dashboard.tsx` | Szűrés javítása: `completed` ne jelenjen meg |
| `src/components/dashboard/WritingStatusCard.tsx` | Progress bar limit 100%, zöld szín ha kész |
| `src/hooks/useEditorData.ts` | Chapter content konvertálása blokkokká |
| `src/types/editor.ts` | Chapter interface bővítése content mezővel |

## Működési folyamat a javítás után

```text
Projekt megnyitása a szerkesztőben
    ↓
fetchBlocks() lekéri a blocks táblát
    ↓
Ha nincsenek blokkok:
    ├── Lekéri chapters.content-et
    ├── Ha van tartalom:
    │   ├── Paragrafusokra bontja (\n\n)
    │   └── Blokkokat hoz létre mindegyikből
    └── Ha nincs: üres paragraph blokk
    ↓
A szerkesztő megjeleníti a blokkokat
```

## Előnyök

- A befejezett projektek nem jelennek meg "folyamatban"-ként
- A 100% feletti progress bar nem furcsa
- A generált tartalom megjelenik a szerkesztőben
- A tartalom szerkeszthető lesz (blokk formátumban)
- Visszafelé kompatibilis: ha már vannak blokkok, azokat használja
