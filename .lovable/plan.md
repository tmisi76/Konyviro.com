
# Dashboard Átalakítási Terv

## Azonosított problémák

### 1. Villogás probléma
A `useProjects` hook a `fetchProjects()` függvényben `setIsLoading(true)`-t állít be minden polling hívásnál. Ez skeleton loader-eket jelenít meg a Dashboard-on, ami villogást okoz.

**Megoldás:** A polling során NE állítsuk be az `isLoading` flag-et - csak az első betöltésnél legyen loading állapot.

### 2. WritingStatusCard nem frissül
A komponens a `useBackgroundWriter` hook-ot használja, ami csak real-time subscription-t használ. Ha a chapters tábla frissül (word_count), a projects tábla nem kapja meg automatikusan az aggregált értéket.

**Megoldás:** Polling hozzáadása a `useBackgroundWriter` hook-hoz, hogy 5 másodpercenként lekérje a legfrissebb adatokat, beleértve a chapters táblából aggregált word_count-ot.

### 3. Dupla polling
A `ProjectCard` saját polling-ot futtat (102-153 sorok), miközben a `useProjects` is polloz. Ez felesleges és zavaró.

**Megoldás:** Távolítsuk el a `ProjectCard` saját polling-ját és használjuk a központi `useProjects` adatokat.

### 4. Layout változások
- Eltávolítani: `WritingStatsPanel` a Dashboard aljáról
- Áthelyezni: `UsagePanel` a sidebar-ba, a Beállítások és Kijelentkezés közé

---

## Technikai változtatások

### 1. `src/hooks/useProjects.ts` - Polling javítás

A polling során ne állítsuk loading-ra az állapotot:

```typescript
const fetchProjects = useCallback(async (isPolling = false) => {
  if (!user) {
    setProjects([]);
    setIsLoading(false);
    return;
  }

  // Csak az első betöltésnél mutassunk loading-ot
  if (!isPolling) {
    setIsLoading(true);
  }
  
  // ... fetch logika változatlan ...
}, [user]);

// Polling módosítás
useEffect(() => {
  // ...
  const interval = setInterval(() => {
    fetchProjects(true); // isPolling = true
  }, POLLING_INTERVALS.PROJECT_STATUS);
  // ...
}, [user, projects, fetchProjects]);
```

### 2. `src/hooks/useBackgroundWriter.ts` - Polling hozzáadása

A real-time subscription mellé polling:

```typescript
// Polling hozzáadása az aktív írások frissítéséhez
useEffect(() => {
  if (!projectId) return;
  
  const isActive = ['writing', 'generating_outlines', 'queued', 'in_progress'].includes(progress.status);
  if (!isActive) return;

  const fetchProgress = async () => {
    // Projekt lekérése
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    // Chapters word_count aggregálása
    const { data: chapters } = await supabase
      .from("chapters")
      .select("word_count")
      .eq("project_id", projectId);

    const totalWords = chapters?.reduce((sum, c) => sum + (c.word_count || 0), 0) || 0;

    if (project) {
      setProgress({
        ...progress,
        wordCount: totalWords, // Aggregált word count!
        // ...többi mező...
      });
    }
  };

  const interval = setInterval(fetchProgress, POLLING_INTERVALS.PROJECT_STATUS);
  return () => clearInterval(interval);
}, [projectId, progress.status]);
```

### 3. `src/components/dashboard/ProjectCard.tsx` - Polling eltávolítása

Töröljük a 102-153 sorok közötti `useEffect` hook-ot, ami saját polling-ot futtat. A kártya az átadott `project` prop-ból kapja az adatokat, ami a `useProjects` hook-ból jön.

### 4. `src/pages/Dashboard.tsx` - WritingStatsPanel eltávolítása

Töröljük a `<WritingStatsPanel />` komponenst (460. sor) a Desktop layout-ból.

### 5. `src/components/dashboard/DashboardSidebar.tsx` - UsagePanel hozzáadása

A sidebar-ba ágyazzuk be a `UsagePanel`-t a Beállítások és Kijelentkezés közé:

```typescript
// Import hozzáadása
import { UsagePanel } from "@/components/dashboard/UsagePanel";

// Bottom links szekció módosítása (238-263 sorok)
<div className={cn("border-t border-sidebar-border p-2", isCollapsed && "flex flex-col items-center")}>
  {/* UsagePanel - csak kinyitott állapotban */}
  {!isCollapsed && (
    <div className="mb-4 px-1">
      <UsagePanel compact />
    </div>
  )}
  
  <button onClick={onSettings} ...>
    <Settings /> Beállítások
  </button>
  
  <div className="my-2 h-px bg-sidebar-border" />
  
  <button onClick={signOut} ...>
    <LogOut /> Kijelentkezés
  </button>
</div>
```

### 6. `src/components/dashboard/UsagePanel.tsx` - Compact mód

Új `compact` prop hozzáadása a sidebar-ba illeszkedő változathoz:

```typescript
interface UsagePanelProps {
  compact?: boolean;
}

export function UsagePanel({ compact = false }: UsagePanelProps) {
  // ...
  
  if (compact) {
    return (
      <div className="space-y-3">
        {/* Szavak progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>AI szavak</span>
            <span>{wordUsage.percent}%</span>
          </div>
          <Progress value={wordUsage.percent} className="h-1.5" />
        </div>
        
        {/* Projektek progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Projektek</span>
            <span>{projectUsage.used}/{projectUsage.total}</span>
          </div>
          <Progress value={projectUsage.percent} className="h-1.5" />
        </div>
      </div>
    );
  }
  
  // Eredeti full nézet...
}
```

### 7. Dashboard layout egyszerűsítése

A `UsagePanel` eltávolítása a main content-ből:

```typescript
{/* Projects section - teljes szélesség */}
<div className="mb-8">
  <h2 className="mb-4 text-lg font-semibold">
    {nonArchivedProjectCount > 0 ? "Legutóbbi projektek" : "Projektek"}
  </h2>
  
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {recentProjects.map((project) => (
      <ProjectCard key={project.id} ... />
    ))}
  </div>
</div>

{/* WritingStatsPanel TÖRÖLVE */}
```

---

## Összefoglaló

| Fájl | Változtatás |
|------|-------------|
| `src/hooks/useProjects.ts` | Polling ne állítson loading-ot |
| `src/hooks/useBackgroundWriter.ts` | Polling + chapters word_count aggregálás |
| `src/components/dashboard/ProjectCard.tsx` | Saját polling eltávolítása |
| `src/pages/Dashboard.tsx` | WritingStatsPanel és UsagePanel eltávolítása |
| `src/components/dashboard/DashboardSidebar.tsx` | UsagePanel beágyazása |
| `src/components/dashboard/UsagePanel.tsx` | Compact mód hozzáadása |

## Működési folyamat a javítás után

```text
Dashboard betöltés
    ↓
useProjects lekéri projekteket (loading skeleton)
    ↓
Projektek megjelennek
    ↓
HA van aktív írás:
    ├── useProjects polloz 5mp-ként (NEM loading, csak frissítés)
    └── WritingStatusCard polloz 5mp-ként (chapters aggregálással)
    ↓
Kártyák zökkenőmentesen frissülnek (nincs villogás)
```

## Előnyök

- Nincs villogás - a polling nem okoz loading állapotot
- Valós adatok - a chapters táblából aggregált word_count
- Egyszerűbb layout - csak a lényeges elemek
- Hatékonyabb - nincs dupla polling
- Kompakt sidebar - UsagePanel a megfelelő helyen
