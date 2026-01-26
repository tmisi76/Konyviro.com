
# Dashboard Projekt Állapot Frissítés - Terv

## Probléma

A Dashboard-on a projektek állapota nem frissül elég gyakran:
- A real-time subscription csak a `projects` tábla változásaira figyel
- A szószám aggregálás (chapters táblából) nem frissül automatikusan
- Ha egy háttérírás befejeződik, a kártya csak a real-time esemény után frissül

## Megoldás

Hozzáadunk egy polling mechanizmust a `useProjects` hook-hoz, ami pár másodpercenként frissíti a projektek állapotát, de **csak akkor, ha van aktív háttérírás**.

---

## Technikai részletek

### 1. `src/hooks/useProjects.ts` módosítások

**Új import:**
```typescript
import { POLLING_INTERVALS } from "@/constants/timing";
```

**Új polling useEffect hozzáadása (a real-time subscription után):**

```typescript
// Polling aktív írás esetén
useEffect(() => {
  if (!user) return;

  // Ellenőrizzük, van-e aktív írásos projekt
  const hasActiveWriting = projects.some(p => 
    p.writing_status && 
    p.writing_status !== 'idle' && 
    p.writing_status !== 'completed' &&
    p.writing_status !== 'failed'
  );

  // Ha nincs aktív írás, nem kell polling
  if (!hasActiveWriting) return;

  // Polling indítása
  const interval = setInterval(() => {
    fetchProjects();
  }, POLLING_INTERVALS.PROJECT_STATUS); // 5000ms

  return () => clearInterval(interval);
}, [user, projects]);
```

---

### 2. `src/constants/timing.ts` - Új konstans (opcionális)

Ha gyorsabb frissítést szeretnénk a Dashboard-on:

```typescript
export const POLLING_INTERVALS = {
  PROJECT_STATUS: 5000,        // 5s - meglévő
  PROJECT_STATUS_FAST: 3000,   // 3s - meglévő
  DASHBOARD_REFRESH: 5000,     // 5s - Dashboard frissítés aktív írás esetén
  // ...
} as const;
```

---

### 3. Alternatív megoldás: Gyorsabb real-time

Ha a real-time subscription megbízhatóan működik, a probléma valószínűleg az, hogy a chapter szószámokat külön kell lekérni. Ebben az esetben a `useProjects` hook `fetchProjects` function-ját kellene a real-time callback-ből is meghívni, nem csak a projekt adatokat frissíteni.

**Módosítás a real-time callback-ben:**

```typescript
.on(
  'postgres_changes',
  {
    event: 'UPDATE',
    schema: 'public',
    table: 'projects',
    filter: `user_id=eq.${user.id}`
  },
  (payload) => {
    const updatedProject = payload.new as Project;
    // Ha a writing_status változott, frissítsük az egész listát
    // hogy a chapter word count-ok is frissüljenek
    if (updatedProject.writing_status === 'writing' || 
        updatedProject.writing_status === 'completed') {
      fetchProjects();
    } else {
      setProjects((prev) =>
        prev.map((p) => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p))
      );
    }
  }
)
```

---

## Összefoglaló

| Fájl | Változtatás |
|------|-------------|
| `src/hooks/useProjects.ts` | Új polling useEffect aktív írás esetén |
| `src/constants/timing.ts` | (opcionális) Új DASHBOARD_REFRESH konstans |

## Működési folyamat

```text
1. Dashboard betöltődik
2. useProjects lekéri a projekteket
3. Real-time subscription elindul
4. HA van aktív írásos projekt:
   a. 5 másodpercenként polling indul
   b. A polling frissíti a projektek listáját (beleértve a chapter word count-okat)
5. HA nincs aktív írás:
   a. Csak a real-time subscription működik
   b. Nincs felesleges polling terhelés
```

## Előnyök

- Automatikus frissítés aktív írás közben
- Nincs felesleges polling, ha nincs aktív írás
- A chapter szószámok is frissülnek (nem csak a projekt státusz)
- Kompatibilis a meglévő real-time rendszerrel

## Megjegyzések

- A polling 5 másodpercenként fut (megegyezik a POLLING_INTERVALS.PROJECT_STATUS-szal)
- Csak akkor aktiválódik, ha van `writing`, `generating_outlines`, `queued`, vagy `in_progress` státuszú projekt
- A real-time subscription továbbra is működik a gyors frissítésekhez
