

# Javítási terv: start-book-writing Edge Function és useBackgroundWriter hook

## Probléma azonosítása

A könyvírás nem indul el, mert:
1. A projektek `in_progress` státuszban ragadtak (régi rendszer által beállítva)
2. A `start-book-writing` function nem kezeli az `in_progress` státuszt
3. A `useBackgroundWriter` hook `canStart` logikája nem engedi az újraindítást `in_progress` státuszból
4. A `writing_jobs` tábla üres - a job-ok sosem lettek létrehozva

## Javítandó fájlok

### 1. `supabase/functions/start-book-writing/index.ts`

**Változtatások:**
- Az `in_progress` státuszt is kezeljük a "már fut" ellenőrzésnél
- Vagy: az `in_progress` státuszt engedjük újraindítani (ha nincs job, akkor nem fut valójában)
- Loggoljuk a kapott chapter adatokat a debugoláshoz
- Adjunk hozzá explicit hibakezelést, ha nincs scene_outline

**Konkrét változások:**

```typescript
// 157-164. sor módosítása
if (action === 'start') {
  // Ellenőrizzük, hogy ténylegesen fut-e már (van-e pending job)
  const { count: existingJobs } = await supabase
    .from("writing_jobs")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId)
    .in("status", ["pending", "processing"]);

  // Ha van aktív job, ne engedjük újraindítani
  if (existingJobs && existingJobs > 0) {
    return new Response(
      JSON.stringify({ error: "A könyvírás már folyamatban van" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Ha nincs aktív job, engedjük az (újra)indítást bármilyen státuszból
  // (kivéve completed - azt külön kell kezelni ha újra akarják indítani)
```

**További változások a job létrehozásnál (200-233. sor körül):**

```typescript
// Loggolás hozzáadása
console.log(`Processing ${chapters.length} chapters for project ${projectId}`);

for (const chapter of chapters) {
  const sceneOutline = (chapter.scene_outline as unknown[]) || [];
  const hasOutline = Array.isArray(sceneOutline) && sceneOutline.length > 0;
  
  console.log(`Chapter "${chapter.title}": has outline = ${hasOutline}, scenes = ${sceneOutline.length}`);
  
  // Mindig hozzunk létre outline job-ot ha nincs outline
  if (!hasOutline) {
    jobs.push({
      project_id: projectId,
      chapter_id: chapter.id,
      job_type: 'generate_outline',
      status: 'pending',
      priority: 10,
      sort_order: sortOrder++,
    });
    totalScenes += 5; // Becslés
  } else {
    // Van outline - scene job-ok létrehozása
    for (let i = 0; i < sceneOutline.length; i++) {
      const scene = sceneOutline[i];
      if (!scene) continue; // null protection
      
      jobs.push({
        project_id: projectId,
        chapter_id: chapter.id,
        job_type: 'write_scene',
        status: 'pending',
        scene_index: i,
        scene_outline: scene,
        priority: 5,
        sort_order: sortOrder++,
      });
    }
    totalScenes += sceneOutline.filter(Boolean).length;
  }
}

console.log(`Total jobs to create: ${jobs.length}, estimated scenes: ${totalScenes}`);
```

---

### 2. `src/hooks/useBackgroundWriter.ts`

**Változtatások a `canStart` logikánál (238. sor):**

```typescript
// Régi:
const canStart = progress.status === 'idle' || progress.status === 'failed';

// Új: engedjük az in_progress státuszból is az újraindítást
const canStart = progress.status === 'idle' 
  || progress.status === 'failed' 
  || progress.status === 'in_progress';  // Régi rendszerből maradt státusz
```

---

### 3. `src/components/dashboard/WritingStatusCard.tsx`

**Változtatások:**
- Az `in_progress` státuszt is kezeljük a statusConfig-ban
- Az `isWriting` és action gombok megfelelő megjelenítése

```typescript
const statusConfig: Record<WritingStatus, {...}> = {
  // ... meglévő státuszok ...
  in_progress: { 
    label: "Folyamatban", 
    color: "bg-blue-500", 
    icon: <Loader2 className="h-3 w-3 animate-spin" /> 
  },
};
```

---

## Összefoglaló

| Fájl | Változtatás |
|------|-------------|
| `start-book-writing/index.ts` | Javított státusz ellenőrzés, jobb logging, null protection |
| `useBackgroundWriter.ts` | `canStart` bővítése `in_progress` kezelésére |
| `WritingStatusCard.tsx` | `in_progress` státusz megjelenítése |

## Tesztelési terv

1. Indítsd el a könyvírást a Dashboard-ról egy `in_progress` státuszú projektnél
2. Ellenőrizd a `writing_jobs` táblát - legyenek benne `generate_outline` típusú job-ok
3. Várj 30 másodpercet - a `pg_cron` job-nak fel kell vennie és feldolgoznia a job-ot
4. Ellenőrizd a progress frissülését a Dashboard-on real-time

