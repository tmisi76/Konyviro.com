
# Lektorálás Háttérfolyamat Javítási Terv

## Jelenlegi vs. Könyvírás Architektúra

| Aspektus | Könyvírás | Lektorálás (jelenlegi) |
|----------|-----------|------------------------|
| Tábla | `projects` | `proofreading_orders` |
| Realtime | ✅ Supabase Realtime subscription | ❌ Nincs |
| Polling | ✅ 5mp-es fallback | ⚠️ 3mp-es polling (egyetlen módszer) |
| UI | `WritingProgressModal` dedikált modal | Egyszerű Progress bar kártyán |
| Bezárható | ✅ Igen, háttérben fut | ⚠️ Elméletben igen, de nincs feedback |

## Javasolt Változtatások

### 1. Supabase Realtime engedélyezése a `proofreading_orders` táblára

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.proofreading_orders;
```

### 2. Hook Átírás - `useProofreading.ts`

A `useBackgroundWriter.ts` mintáját követve:
- **Realtime subscription** a `proofreading_orders` táblára
- **Polling fallback** csak aktív státuszokhoz
- **Automatikus UI frissítés** minden változáskor

```typescript
// Új architektúra
useEffect(() => {
  // Realtime subscription
  const channel = supabase
    .channel(`proofreading-${projectId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'proofreading_orders',
      filter: `project_id=eq.${projectId}`
    }, (payload) => {
      setOrder(payload.new);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [projectId]);
```

### 3. Polling Finomítás

A polling megmarad backup-ként, de csak aktív státuszokhoz (`paid`, `processing`):
- 3 másodperces intervallum az aktív feldolgozás alatt
- Automatikus leállítás `completed` vagy `failed` státusznál

### 4. Toast Üzenetek Javítása

Jelenlegi probléma: A toast üzenetek `order?.status` useEffect dependency-ként vannak, de a `completed`/`failed` ellenőrzés túl korán fut.

Javítás: Csak realtime/poll update után fusson le, ne minden renderkor.

## Implementációs Terv

### Fázis 1: Adatbázis - Realtime Engedélyezés

**Migráció:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.proofreading_orders;
```

### Fázis 2: Hook Újraírás

**Fájl:** `src/hooks/useProofreading.ts`

Változások:
1. Realtime subscription hozzáadása
2. Polling logika finomítása (csak aktív státuszoknál)
3. Toast logika javítása (csak státusz változáskor)
4. `useRef` az előző státusz tárolásához

### Fázis 3: UI (Opcionális Bővítés)

Opcionálisan a `ProofreadingTab` is kaphat egy modernebb progress megjelenítést:
- Jelenlegi fejezet neve
- Becsült hátralevő idő
- "Háttérben fut" jelzés

## Technikai Részletek

### Realtime Subscription Minta (useBackgroundWriter-ből)

```typescript
const channel = supabase
  .channel(`proofreading-order-${projectId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'proofreading_orders',
      filter: `project_id=eq.${projectId}`
    },
    (payload) => {
      const order = payload.new as ProofreadingOrder;
      // Frissítés
    }
  )
  .subscribe();
```

### Polling + Realtime Kombináció

```typescript
// 1. Realtime a fő csatorna
// 2. Polling backup az aktív státuszokhoz
useEffect(() => {
  const isActive = order?.status === "paid" || order?.status === "processing";
  
  if (!isActive) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    return;
  }
  
  pollingRef.current = setInterval(refetchOrder, 3000);
  return () => clearInterval(pollingRef.current);
}, [order?.status]);
```

### Toast Javítás - Előző Státusz Figyelése

```typescript
const prevStatusRef = useRef<string | null>(null);

useEffect(() => {
  if (!order) return;
  
  // Csak ha a státusz tényleg VÁLTOZOTT
  if (prevStatusRef.current !== order.status) {
    if (order.status === "completed" && prevStatusRef.current === "processing") {
      toast.success("Lektorálás befejezve!");
    } else if (order.status === "failed") {
      toast.error(order.error_message || "Hiba történt");
    }
    prevStatusRef.current = order.status;
  }
}, [order?.status]);
```

## Összefoglaló

| Változás | Fájl | Típus |
|----------|------|-------|
| Realtime engedélyezés | Migráció | SQL |
| Hook újraírás | `src/hooks/useProofreading.ts` | TypeScript |
| (Opcionális) UI bővítés | `src/components/proofreading/ProofreadingTab.tsx` | React |

A fő cél: A lektorálás ugyanúgy működjön, mint a könyvírás - **realtime frissítésekkel**, **megbízható háttérfolyamattal**, és **felhasználóbarát feedback-kel**.
