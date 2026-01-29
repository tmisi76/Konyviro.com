

# Lektorálás Dashboard Integráció

## Összefoglaló

A lektorálás indítása után a felhasználó automatikusan átirányításra kerül a Dashboard-ra, ahol egy új "Folyamatban lévő lektorálások" szekcióban követheti az előrehaladást - pontosan úgy, mint az automata könyvírásoknál.

## Jelenlegi Architektúra

| Komponens | Könyvírás | Lektorálás (jelenleg) |
|-----------|-----------|------------------------|
| Dashboard megjelenítés | `WritingStatusCard` | Nincs |
| Státusz szekció | "Folyamatban lévő írások" | Nincs |
| Háttérfolyamat | Realtime + polling | Realtime + polling (már kész) |
| Indítás utáni redirect | Nincs (inline marad) | Nincs (inline marad) |

## Javasolt Változtatások

### 1. Új Komponens: `ProofreadingStatusCard`

Hasonló a `WritingStatusCard`-hoz, de lektorálásra optimalizálva:
- Projekt neve
- Progress bar (fejezetek)
- Státusz badge (Processing, Completed, Failed)
- "Megnyitás" gomb a projekt szerkesztőhöz

**Fájl:** `src/components/dashboard/ProofreadingStatusCard.tsx`

```text
┌──────────────────────────────────────────────────────────┐
│ 📖 "A Sötét Erdő" könyve                   [Lektorálás]  │
├──────────────────────────────────────────────────────────┤
│ Fejezetek: 5 / 14                                        │
│ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 36%              │
│                                                          │
│ Elindítva: 2 perce            [Szerkesztő megnyitása →] │
└──────────────────────────────────────────────────────────┘
```

### 2. Dashboard Módosítás

A Dashboard-on új szekcióban jelennek meg az aktív lektorálások:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                                      │
├─────────────────────────────────────────────────────────────────┤
│  📊 Statisztikák (3 kártya)                                    │
├─────────────────────────────────────────────────────────────────┤
│  📝 Folyamatban lévő írások        ← Könyvírás (már létezik)   │
│     [WritingStatusCard] [WritingStatusCard]                     │
├─────────────────────────────────────────────────────────────────┤
│  ✍️ Folyamatban lévő lektorálások  ← ÚJ SZEKCIÓ                │
│     [ProofreadingStatusCard]                                    │
├─────────────────────────────────────────────────────────────────┤
│  📚 Legutóbbi könyveim                                         │
│     [ProjectCard] [ProjectCard] ...                             │
└─────────────────────────────────────────────────────────────────┘
```

**Fájl módosítás:** `src/pages/Dashboard.tsx`

Változások:
- Új hook: `useActiveProofreadings()` a futó lektorálások lekérdezéséhez
- Új szekció a "Folyamatban lévő írások" alatt
- Realtime subscription a `proofreading_orders` táblára

### 3. Indítás Utáni Redirect

Amikor a felhasználó elindítja a lektorálást (akár vásárlás után, akár admin teszt), automatikusan átirányítjuk a Dashboard-ra.

**Fájl módosítás:** `src/hooks/useProofreading.ts`

A `testMutation` `onSuccess` callback-jében:
```typescript
onSuccess: () => {
  toast.success("Lektorálás elindítva!");
  navigate("/dashboard"); // ← ÚJ
}
```

**Fájl módosítás:** `src/components/proofreading/ProofreadingTab.tsx`

A komponens props-ot kap egy `onStarted` callback-hez, ami meghívja a navigate-et.

### 4. Új Hook: `useActiveProofreadings`

Lekérdezi az összes aktív (`paid` vagy `processing` státuszú) lektorálást a bejelentkezett felhasználóhoz.

**Fájl:** `src/hooks/useActiveProofreadings.ts`

```typescript
export function useActiveProofreadings() {
  // Query: proofreading_orders WHERE status IN ('paid', 'processing')
  // JOIN projects to get project title
  // Realtime subscription for instant updates
}
```

## Automatikus Indítás Kérdése

**Igen, automatikusan elindul a lektorálás:**

1. **Admin teszt:** Az `admin-test-proofreading` edge function:
   - Létrehozza az order-t `status: "paid"` státusszal
   - Fire-and-forget módon meghívja a `process-proofreading` function-t
   - A háttérben azonnal elkezdődik a feldolgozás

2. **Fizetett vásárlás:** A `proofreading-webhook`:
   - Stripe webhook-tól kapja az eseményt
   - Frissíti az order státuszt `paid`-re
   - Fire-and-forget módon hívja a `process-proofreading`-ot

Mindkét esetben a folyamat **automatikusan elindul és a háttérben fut**.

## Implementációs Terv

### Fázis 1: Új Komponensek

| Fájl | Művelet |
|------|---------|
| `src/components/dashboard/ProofreadingStatusCard.tsx` | Létrehozás |
| `src/hooks/useActiveProofreadings.ts` | Létrehozás |

### Fázis 2: Dashboard Integráció

| Fájl | Módosítás |
|------|-----------|
| `src/pages/Dashboard.tsx` | Új szekció hozzáadása lektorálásokhoz |

### Fázis 3: Redirect Logika

| Fájl | Módosítás |
|------|-----------|
| `src/hooks/useProofreading.ts` | Navigate hozzáadása az onSuccess-hez |
| `src/components/proofreading/ProofreadingTab.tsx` | useNavigate import és használat |

## Technikai Részletek

### ProofreadingStatusCard Felépítése

```typescript
interface ProofreadingStatusCardProps {
  orderId: string;
  projectId: string;
  projectTitle: string;
  status: "paid" | "processing" | "completed" | "failed";
  currentChapter: number;
  totalChapters: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}
```

### useActiveProofreadings Return Value

```typescript
{
  activeProofreadings: Array<{
    id: string;
    project_id: string;
    project_title: string;
    status: "paid" | "processing";
    current_chapter_index: number;
    total_chapters: number;
    started_at: string | null;
  }>;
  isLoading: boolean;
  refetch: () => void;
}
```

### Realtime Subscription a Dashboard-on

```typescript
useEffect(() => {
  const channel = supabase
    .channel('dashboard-proofreading')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'proofreading_orders',
      filter: `user_id=eq.${user?.id}`
    }, () => {
      refetchProofreadings();
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [user?.id]);
```

## Összefoglaló Táblázat

| Lépés | Fájl | Típus |
|-------|------|-------|
| 1 | `src/hooks/useActiveProofreadings.ts` | Új fájl |
| 2 | `src/components/dashboard/ProofreadingStatusCard.tsx` | Új fájl |
| 3 | `src/pages/Dashboard.tsx` | Módosítás |
| 4 | `src/hooks/useProofreading.ts` | Módosítás |
| 5 | `src/components/proofreading/ProofreadingTab.tsx` | Módosítás |

A végeredmény: A lektorálás indítása után a felhasználó automatikusan a Dashboard-ra kerül, ahol a könyvírásokhoz hasonlóan látja a folyamat előrehaladását, és bármikor bezárhatja az oldalt.

