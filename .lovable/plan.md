
# Terv: "Maffiózóból országgyűlési képviselő" könyv befejezése

## Probléma diagnózis

A könyv jelenleg **59%-nál áll meg** (29,462 szó az 50,000-ből), annak ellenére, hogy a rendszer "completed" státuszba tette.

### Gyökérokok

**1. Race Condition a tartalomírásnál:**
A `processSceneJob` függvényben a content hozzáfűzés nem atomi:
```typescript
// 1. Lekéri a chapter-t
const existingContent = currentChapter.content || "";
// 2. Hozzáfűzi az új jelenetet
const newContent = existingContent + separator + sceneContent;
// 3. Elmenti
await supabase.from("chapters").update({ content: newContent, ... })
```

Ha két jelenetírás párhuzamosan fut ugyanarra a fejezetre, az egyik felülírja a másik munkáját.

**2. Párhuzamos végrehajtás:**
A pg_cron 30 másodpercenként futtatja a job processor-t, de az AI hívás 10-30+ másodpercig tarthat. Így több worker is dolgozhat ugyanazon fejezet jelenetein párhuzamosan.

**3. Hibás befejezési logika:**
A rendszer `pendingCount === 0` alapján jelzi a befejezést, nem ellenőrizve a tényleges szószámot.

### Eredmény
- **93 jelenet tervezve** a scene_outline-ban
- **54 jelenet tartalma mentve** (39 elveszett a race condition miatt)
- Könyv státusz: "completed" (hamisan)

## Megoldási terv

### 1. Fázis: Azonnali javítás - Atomikus content hozzáfűzés

**Fájl:** `supabase/functions/process-writing-job/index.ts`

Módosítjuk a `processSceneJob` függvényt, hogy **ROW LEVEL LOCK**-ot használjon:

```typescript
// Tranzakció-szerű művelet: SELECT FOR UPDATE pattern
// 1. Lockoljuk a chapter-t
// 2. Frissítjük a content-et SQL-ben (append)
// Ez biztosítja, hogy a párhuzamos írások sorban történjenek

await supabase.rpc('append_chapter_content', {
  p_chapter_id: currentChapter.id,
  p_new_content: sceneContent,
  p_word_count_delta: wordCount
});
```

Új RPC függvény létrehozása:
```sql
CREATE OR REPLACE FUNCTION append_chapter_content(
  p_chapter_id UUID,
  p_new_content TEXT,
  p_word_count_delta INTEGER DEFAULT 0
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  current_content TEXT;
  new_content TEXT;
  total_words INTEGER;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT content INTO current_content
  FROM chapters
  WHERE id = p_chapter_id
  FOR UPDATE;
  
  -- Append content
  IF current_content IS NULL OR current_content = '' THEN
    new_content := p_new_content;
  ELSE
    new_content := current_content || E'\n\n' || p_new_content;
  END IF;
  
  -- Calculate word count
  total_words := array_length(
    string_to_array(trim(new_content), ' '), 1
  );
  
  -- Update atomically
  UPDATE chapters
  SET 
    content = new_content,
    word_count = COALESCE(total_words, 0),
    scenes_completed = scenes_completed + 1,
    writing_status = 'writing'
  WHERE id = p_chapter_id;
END;
$$;
```

### 2. Fázis: Könyv újraírása - Hiányzó jelenetek pótlása

**Új Edge Function:** `supabase/functions/recover-missing-scenes/index.ts`

Ez a függvény:
1. Összegyűjti a fejezetek scene_outline-jait
2. Megkeresi, mely jelenetek hiányoznak a tartalomból (heurisztika alapján)
3. Új writing_jobs-okat hoz létre a hiányzó jelenetekhez
4. Újraindítja az írási folyamatot

Mivel a content-ből nem tudjuk pontosan megmondani, melyik jelenet hiányzik, egy egyszerűbb megközelítést használunk:

**Minden fejezet újragenerálása ami nem teljes:**
- Ha `scenes_completed < total_scenes` → újraírjuk a hiányzó jeleneteket
- A meglévő tartalom megmarad, csak kiegészítjük

### 3. Fázis: Dashboard/Admin felület bővítése

**Új gomb a WritingStatusCard-on:** "Írás folytatása" a félbemaradt könyvekhez

Amikor a könyv "completed" de a word_count < target_word_count * 0.8:
- Megjelenítünk egy "Könyv nem teljes" jelzést
- "Folytatás" gomb ami meghívja a recovery edge function-t

### 4. Fázis: Megelőzés - Befejezési validáció

**Fájl:** `supabase/functions/process-writing-job/index.ts` - `updateProjectProgress`

```typescript
// Csak akkor "completed" ha:
// 1. Nincs pending job
// 2. A word_count >= target_word_count * 0.7 (70%)
const targetWordCount = project.target_word_count || 50000;
const isActuallyCompleted = 
  pendingCount === 0 && 
  totalWords >= targetWordCount * 0.7;
```

## Implementációs sorrend

1. **Adatbázis migráció:** `append_chapter_content` RPC függvény létrehozása
2. **Edge Function frissítés:** `process-writing-job` atomikus content kezelésre
3. **Recovery Edge Function:** `recover-missing-scenes` létrehozása
4. **Specifikus könyv javítása:** Recovery futtatása a "Maffiózóból..." projektre
5. **UI frissítés:** "Folytatás" gomb hozzáadása

## Technikai részletek

### Érintett fájlok
- `supabase/functions/process-writing-job/index.ts` - atomikus content append
- `supabase/functions/recover-missing-scenes/index.ts` (új) - recovery logika
- `src/components/dashboard/WritingStatusCard.tsx` - "Folytatás" gomb
- `src/hooks/useBackgroundWriter.ts` - recovery trigger

### Adatbázis módosítások
- Új RPC: `append_chapter_content` - atomikus content hozzáfűzés
- (Opcionális) Új RPC: `increment_scenes_completed` - atomi számláló

### Befejezési kritérium
A "Maffiózóból országgyűlési képviselő" könyv eléri:
- Minimum 45,000 szót (90% a 50,000-ből)
- Minden fejezet scenes_completed = total_scenes
- writing_status = 'completed' validált állapotban
