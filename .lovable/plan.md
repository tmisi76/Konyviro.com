
# Javítási terv: A megírt szöveg mentése a fejezetekhez

## Probléma azonosítása

A háttérírás során a `write-section` edge function sikeresen generálja a szöveget, de:
1. A `processSceneJob` function a `process-writing-job`-ban **nem menti el a content-et** a chapters táblába
2. Csak a `scenes_completed` számlálót növeli
3. Ezért a fejezetek `word_count: 0` és `content: null` marad
4. Az email kiküldésre kerül a "befejezés" után, de a könyv valójában üres

## Érintett fájl

### `supabase/functions/process-writing-job/index.ts`

A `processSceneJob` function-t kell módosítani (279-321. sorok).

## Szükséges változtatások

### 1. A szekció tartalmának mentése a chapter-hez

A `write-section` visszaadja a `{ content, wordCount }` objektumot. Ezt a tartalmat hozzá kell fűzni a chapter `content` mezőjéhez.

```typescript
async function processSceneJob(supabase, job, project, chapter) {
  const sceneIndex = job.scene_index;
  console.log(`Writing scene ${sceneIndex + 1} for chapter: ${chapter.title}`);
  
  // ... fetch hívás ...
  
  const result = await response.json();
  const sceneContent = result.content || "";
  const wordCount = result.wordCount || 0;
  
  // ÚJ: Fűzzük hozzá a chapter content-hez
  const existingContent = chapter.content || "";
  const separator = existingContent.length > 0 ? "\n\n" : "";
  const newContent = existingContent + separator + sceneContent;
  
  // Számoljuk újra a teljes szószámot
  const totalWords = newContent.trim().split(/\s+/).filter(w => w.length > 0).length;
  
  // Fejezet frissítése A TARTALOMMAL
  await supabase.from("chapters")
    .update({ 
      content: newContent,
      word_count: totalWords,
      scenes_completed: (chapter.scenes_completed || 0) + 1,
      writing_status: 'writing'
    })
    .eq("id", chapter.id);

  console.log(`Scene ${sceneIndex + 1} completed with ${wordCount} words`);
  return true;
}
```

### 2. Fejezet frissített adatainak lekérése minden scene előtt

Mivel a chapter objektum a job feldolgozás elején kerül lekérésre, és a content változik minden scene után, frissítenünk kell a chapter adatokat a `processSceneJob`-ban:

```typescript
async function processSceneJob(supabase, job, project, chapter) {
  const sceneIndex = job.scene_index;
  
  // FRISSÍTETT chapter lekérése a legújabb content-tel
  const { data: currentChapter } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", chapter.id)
    .single();
  
  if (!currentChapter) {
    throw new Error("Chapter not found");
  }
  
  console.log(`Writing scene ${sceneIndex + 1} for chapter: ${currentChapter.title}`);
  
  // ... fetch hívás a write-section-höz ...
  
  const result = await response.json();
  const sceneContent = result.content || "";
  const wordCount = result.wordCount || 0;
  
  // Hozzáfűzés a meglévő tartalomhoz
  const existingContent = currentChapter.content || "";
  const separator = existingContent.length > 0 ? "\n\n" : "";
  const newContent = existingContent + separator + sceneContent;
  const totalWords = newContent.trim().split(/\s+/).filter(w => w.length > 0).length;
  
  await supabase.from("chapters")
    .update({ 
      content: newContent,
      word_count: totalWords,
      scenes_completed: (currentChapter.scenes_completed || 0) + 1,
      writing_status: 'writing'
    })
    .eq("id", chapter.id);

  console.log(`Scene ${sceneIndex + 1} completed with ${wordCount} words, total chapter: ${totalWords} words`);
  return true;
}
```

### 3. Email küldés validálás - ne küldj emailt, ha nincs tartalom

Az `updateProjectProgress` function-ben ellenőrizzük, hogy tényleg van-e tartalom a fejezetekben:

```typescript
async function updateProjectProgress(supabase, projectId) {
  // ... meglévő count lekérések ...
  
  const isCompleted = pendingCount === 0;
  
  // Ellenőrizzük, hogy tényleg van-e tartalom
  if (isCompleted) {
    const { data: chapters } = await supabase
      .from("chapters")
      .select("word_count")
      .eq("project_id", projectId);
    
    const hasContent = chapters?.some(ch => (ch.word_count || 0) > 0);
    
    // Csak akkor küldünk emailt, ha van tényleges tartalom
    if (hasContent && totalWords > 0) {
      await sendCompletionEmail(supabase, projectId);
    }
  }
  
  // ... projekt frissítés ...
}
```

## Összefoglaló táblázat

| Probléma | Megoldás |
|----------|----------|
| A content nincs mentve | `processSceneJob` frissíti a chapter.content-et |
| A word_count 0 marad | A chapter.word_count is frissül |
| Email üres könyvre megy ki | Validáció hozzáadása az email küldés előtt |
| Régi chapter adat | Frissített chapter lekérése minden scene előtt |

## Tesztelési terv

1. Indíts el egy új könyvírást
2. Ellenőrizd a `chapters` táblát - a `content` mező növekedjen minden scene után
3. Ellenőrizd a `word_count` értékeket - ne legyenek 0
4. A befejezés után az email csak akkor menjen ki, ha van tartalom
