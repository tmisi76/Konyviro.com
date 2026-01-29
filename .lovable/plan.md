

# Lektorálás Edge Function Hibakeresés és Javítás

## Azonosított Problémák

### 1. Státusz Ellenőrzés Blokkolja az Újraindítást

**Probléma helye:** `process-proofreading/index.ts` 99-105. sor

```typescript
if (order.status !== "paid") {
  console.log("Order not in paid status, skipping:", order.status);
  return new Response(
    JSON.stringify({ message: "Order not ready for processing" }),
    ...
  );
}
```

**Következmény:** Amikor a function timeout-ol vagy crash-el a 2. fejezetnél, az order már `processing` státuszban van. A következő híváskor a function azonnal visszatér "Order not ready" üzenettel, és SOHA nem folytatja a munkát.

**Bizonyíték a tesztből:**
```
curl POST /process-proofreading { orderId: "b7ba3156..." }
Response: { "message": "Order not ready for processing" }
```

### 2. Nincs Retry Logika az AI Hívásnál

**Probléma helye:** `process-proofreading/index.ts` 36-69. sor

A `proofreadChapter` function közvetlenül hívja az Anthropic API-t:
- **Nincs timeout kezelés** (AbortController)
- **Nincs retry logika** (429, 502, 503, 504 hibákra)
- **Nincs exponential backoff**

**Összehasonlítás a `write-section/index.ts`-sel:**
- 7 próbálkozás
- 120 mp timeout
- Exponential backoff (5s → 60s)
- Rate limit (429) és gateway error (502/503/504) kezelés

### 3. Nincs Folytatási Logika

**Probléma:** A function mindig a 0. fejezettől indul, nem a `current_chapter_index`-től.

```typescript
// Jelenlegi kód (129. sor):
for (const chapter of chapters) {
  // Minden fejezetet újra feldolgoz az elejétől
}

// Javított logika kellene:
for (let i = order.current_chapter_index; i < chapters.length; i++) {
  // Csak a még nem feldolgozott fejezeteket dolgozza fel
}
```

### 4. Hosszú Futási Idő → Edge Function Timeout

**Probléma:** A Claude Opus API hívás egy fejezetre ~30-60 másodpercig tart. 14 fejezetnél ez 7-14 perc, de az edge function timeout ~60-90 másodperc.

**Megoldási lehetőségek:**
1. **Job queue architektúra** (mint a könyvírás): Minden fejezet külön edge function hívás
2. **Chunked processing**: Egy hívás = 1 fejezet, majd újrahívja magát

## Javasolt Megoldás: Job Queue Architektúra

A könyvíráshoz hasonlóan, a lektorálásnak is job queue-t kellene használnia:

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. start-proofreading (trigger)                                │
│     - Order létrehozás                                          │
│     - Első job queue bejegyzés                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. process-proofreading-chapter (worker)                       │
│     - Egy fejezet feldolgozása                                  │
│     - Ha van még fejezet → következő job enqueue               │
│     - Ha nincs → status: completed                              │
└─────────────────────────────────────────────────────────────────┘
```

## Implementációs Terv

### Fázis 1: Azonnali Javítások (process-proofreading refactor)

| Módosítás | Leírás |
|-----------|--------|
| Státusz ellenőrzés | `paid` VAGY `processing` esetén fusson |
| Folytatás | Használja `current_chapter_index`-et kezdőpontnak |
| Retry logika | `fetchWithRetry` használata az AI híváshoz |
| Timeout | AbortController 120s timeout-tal |
| Egy fejezet/hívás | Egy hívás = 1 fejezet, majd fire-and-forget újrahívás |

### Fázis 2: Edge Function Módosítások

**Fájl:** `supabase/functions/process-proofreading/index.ts`

1. **Státusz ellenőrzés javítása:**
```typescript
// Folytatható, ha "paid" VAGY "processing"
if (order.status !== "paid" && order.status !== "processing") {
  return ...;
}
```

2. **Folytatási logika:**
```typescript
const startIndex = order.current_chapter_index || 0;
const chapter = chapters[startIndex];

// Csak 1 fejezet feldolgozása hívásonként
```

3. **Retry logika hozzáadása:**
```typescript
import { fetchWithRetry, RETRY_CONFIG } from "../_shared/retry-utils.ts";

async function proofreadChapter(content: string, chapterTitle: string): Promise<string> {
  const result = await fetchWithRetry({
    url: "https://api.anthropic.com/v1/messages",
    options: {
      method: "POST",
      headers: { ... },
      body: JSON.stringify({ ... }),
    },
    maxRetries: 7,
    timeoutMs: 120000,
    onRetry: (attempt, status) => {
      console.log(`Retry ${attempt} for chapter "${chapterTitle}", status: ${status}`);
    },
  });
  
  if (!result.response?.ok) {
    throw new Error(`API error after ${result.attempts} attempts`);
  }
  
  const data = await result.response.json();
  return data.content[0].text;
}
```

4. **Önhívó architektúra (1 fejezet/hívás):**
```typescript
// Egy fejezet feldolgozása után újrahívja magát
if (nextChapterIndex < chapters.length) {
  fetch(processUrl, {
    method: "POST",
    headers: { ... },
    body: JSON.stringify({ orderId }),
  }).catch(console.error);
}
```

## Összefoglaló Táblázat

| Probléma | Megoldás | Prioritás |
|----------|----------|-----------|
| Státusz blokkolás | `paid` VAGY `processing` elfogadása | Kritikus |
| Nincs folytatás | `current_chapter_index` használata | Kritikus |
| Nincs retry | `fetchWithRetry` integrálás | Magas |
| Timeout | 1 fejezet/hívás + önhívás | Magas |

## Technikai Részletek

### Javított Státusz Logika

```typescript
// RÉGI (hibás):
if (order.status !== "paid") { return; }

// ÚJ (helyes):
if (order.status !== "paid" && order.status !== "processing") { 
  console.log("Order completed or failed, skipping:", order.status);
  return; 
}

// Csak paid → processing váltás, ha még nem processing
if (order.status === "paid") {
  await supabaseAdmin
    .from("proofreading_orders")
    .update({ status: "processing" })
    .eq("id", orderId);
}
```

### Önhívó Architektúra Flow

```text
1. admin-test-proofreading létrehoz ordert (status: paid)
2. Meghívja process-proofreading (orderId)
3. process-proofreading:
   a. Ellenőrzi státuszt (paid VAGY processing → OK)
   b. Lekéri current_chapter_index (pl. 0)
   c. Feldolgozza a 0. fejezetet
   d. Frissíti current_chapter_index = 1
   e. Fire-and-forget hívja önmagát (orderId)
   f. Visszatér sikerrel
4. Következő hívás:
   a. current_chapter_index = 1
   b. Feldolgozza az 1. fejezetet
   c. ... és így tovább
5. Utolsó fejezet után:
   a. status: completed
   b. Nem hívja újra magát
```

Ez a megközelítés:
- Elkerüli az edge function timeout-ot
- Lehetővé teszi a folytatást hiba után
- Megbízhatóbbá teszi a hosszú feldolgozásokat

