

# Lektorálás Javítási Terv

## Azonosított Problémák

### 1. Edge Function Timeout Probléma

**Hiba:** Az `admin-test-proofreading` szinkron módon (`await fetch(...)`) hívja meg a `process-proofreading` funkciót és VÁRJA a választ. Mivel a lektorálás 14 fejezetnél percekig tart, a kapcsolat timeout-ol.

**Bizonyíték a logokból:**
```
Processing chapter 1/14: A telefon
Process proofreading failed:
Http: connection closed before message completed
```

**Megoldás:** A `proofreading-webhook`-hoz hasonlóan fire-and-forget módon kell hívni:
```typescript
// JELENLEGI (rossz):
const processResponse = await fetch(processUrl, {...});

// JAVÍTOTT (jó):
fetch(processUrl, {...}).catch((err) => {
  console.error("Failed to trigger proofreading process:", err);
});
```

### 2. Infinite Loop a useProofreading Hook-ban

**Hiba:** A polling useEffect-ben az `isPolling` state a dependency listában van, és az effect-en belül is változtatjuk - ez infinite loop-ot okoz.

**Console Error:**
```
Maximum update depth exceeded... at ProofreadingTab
```

**Probléma kód (135-155. sor):**
```typescript
useEffect(() => {
  if (shouldPoll && !isPolling) {
    setIsPolling(true);  // ← Ez triggereli újra az effect-et
    // ...
  }
}, [order?.status, isPolling, refetchOrder]); // ← isPolling itt van
```

**Megoldás:** useRef használata az isPolling helyett, vagy a polling logika átstrukturálása.

---

## Javítási Terv

### Fázis 1: Edge Function Fix

**Fájl:** `supabase/functions/admin-test-proofreading/index.ts`

Módosítás a 125-151. sor környékén:
- Változtatás `await fetch(...)` → `fetch(...).catch(...)`
- Azonnal visszatérés sikerrel, ne várjuk meg a feldolgozást
- A frontend majd a polling-gel követi az előrehaladást

### Fázis 2: Hook Infinite Loop Fix

**Fájl:** `src/hooks/useProofreading.ts`

Módosítás a polling useEffect-ben (136-155. sor):
- `useState` helyett `useRef` használata az `isPolling` állapothoz
- Vagy a dependency array átszervezése, hogy ne okozzon circular update-et

---

## Elvárt Viselkedés Javítás Után

```text
┌────────────────────────────────────────────────────────────────┐
│  Admin kattint "TESZT Lektorálás" gombra                      │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  admin-test-proofreading:                                      │
│  1. Létrehoz order-t (status: "paid")                         │
│  2. Fire-and-forget hívja process-proofreading-ot             │
│  3. AZONNAL visszatér: { success: true, orderId: "..." }      │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  Frontend:                                                     │
│  - Toast: "Teszt lektorálás elindítva!"                       │
│  - Polling elindul (3 másodpercenként)                        │
│  - Progress bar megjelenik                                     │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼ (háttérben)
┌────────────────────────────────────────────────────────────────┐
│  process-proofreading (fut a háttérben):                       │
│  - Fejezetenként lektorál Claude Opus-szal                    │
│  - Minden fejezet után frissíti current_chapter_index-et      │
│  - Végén status: "completed"                                   │
└────────────────────────────────────────────────────────────────┘
```

---

## Technikai Módosítások Összefoglalva

| Fájl | Módosítás |
|------|-----------|
| `supabase/functions/admin-test-proofreading/index.ts` | `await fetch()` → `fetch().catch()` fire-and-forget |
| `src/hooks/useProofreading.ts` | useRef az isPolling-hoz, dependency array fix |

