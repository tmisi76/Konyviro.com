
# AI Lektor Szolgáltatás Terv

## Funkció Áttekintése

Egy egyszeri díjas AI lektorálási szolgáltatás, amely:
1. **Figyelmeztet** a felhasználót, hogy a szoftver nyersanyagot generál, amit érdemes lektoráltatni
2. **Egyszeri fizetés** után azonnal elindul a háttérben
3. **Felülírja** az eredeti fejezeteket a lektorált verzióval (destruktív művelet)

---

## Árazási Logika

Claude Opus 4.5 API költség alapján (szószám × token arány × API ár × 2):

| Könyvméret | Becsült szó | Ár |
|------------|-------------|-----|
| Kis könyv | 10 000 szó | 1 990 Ft |
| Közepes könyv | 50 000 szó | 4 990 Ft |
| Nagy könyv | 100 000 szó | 8 990 Ft |

**Képlet**: `ár = szószám × 0.1 Ft` (kerekítve)

---

## Felhasználói Flow

```text
┌─────────────────────────────────────────────────────────────┐
│  [Exportálás] fül vagy [Lektor] új tab a projektben        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ FIGYELEM                                                │
│  A szoftver által generált szöveg nyersanyag.               │
│  Kiadás előtt javasoljuk a lektorálást.                     │
│                                                             │
│  ──────────────────────────────────────────────────────────│
│                                                             │
│  🤖 AI LEKTOR SZOLGÁLTATÁS                                  │
│                                                             │
│  A könyved: 47 320 szó                                      │
│  Lektorálás díja: 4 732 Ft (egyszeri)                       │
│                                                             │
│  Mit tartalmaz:                                             │
│  ✓ Helyesírás és nyelvtan ellenőrzés                        │
│  ✓ Stilisztikai javítások                                   │
│  ✓ Ismétlődések eltávolítása                                │
│  ✓ Mondatritmus javítása                                    │
│  ✓ Nyomdakész szöveg                                        │
│                                                             │
│  ⚠️ Figyelem: A lektorálás felülírja az eredeti szöveget!  │
│                                                             │
│  [       🔒 Lektorálás megvásárlása - 4 732 Ft       ]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Adatbázis Módosítások

### Új tábla: `proofreading_orders`

| Oszlop | Típus | Leírás |
|--------|-------|--------|
| id | uuid | Elsődleges kulcs |
| user_id | uuid | Felhasználó |
| project_id | uuid | Projekt |
| stripe_session_id | text | Stripe session |
| amount | integer | Összeg (Ft) |
| word_count | integer | Szószám a vásárláskor |
| status | text | pending / paid / processing / completed / failed |
| current_chapter_index | integer | Aktuális fejezet index (0-tól) |
| total_chapters | integer | Összes fejezet |
| started_at | timestamptz | Feldolgozás kezdete |
| completed_at | timestamptz | Befejezés ideje |
| error_message | text | Hiba esetén |
| created_at | timestamptz | Létrehozás |

---

## Backend Komponensek

### 1. Edge Function: `create-proofreading-purchase`

**Feladat**: Stripe checkout session létrehozása

```text
Input:
  - projectId: string
  
Folyamat:
  1. Felhasználó hitelesítése
  2. Projekt szószámának lekérdezése (SUM chapters.word_count)
  3. Ár kiszámítása: Math.round(wordCount * 0.1)
  4. Stripe checkout session létrehozása (mode: payment)
  5. proofreading_orders rekord beszúrása (status: pending)
  
Output:
  - url: Stripe checkout URL
```

### 2. Edge Function: `proofreading-webhook`

**Feladat**: Stripe webhook kezelése, lektorálás indítása

```text
Event: checkout.session.completed

Folyamat:
  1. Order status → paid
  2. Lektorálás elindítása (háttérben)
  3. Értesítő email küldése
```

### 3. Edge Function: `process-proofreading`

**Feladat**: Fejezetek lektorálása egyenként

```text
Folyamat:
  1. Order lekérése
  2. Minden fejezetre:
     a. Claude Opus 4.5 hívása a lektoráláshoz
     b. Fejezet content felülírása
     c. current_chapter_index növelése
  3. Status → completed
  4. Befejező email küldése
```

**AI Prompt stratégia**:
```text
Te egy professzionális magyar könyvlektor vagy. 

FELADATOD:
1. Helyesírási hibák javítása
2. Nyelvtani hibák kijavítása  
3. Stilisztikai javítások (ismétlődések, klisék)
4. Mondatritmus javítása
5. Bekezdések strukturálása

SZABÁLYOK:
- Őrizd meg a szerző hangját és stílusát
- Ne változtasd meg a cselekményt
- Ne adj hozzá új tartalmakat
- A válaszod CSAK a javított szöveg legyen
```

---

## Frontend Komponensek

### 1. `ProofreadingTab.tsx` (új tab a ProjectEditor-ban)

**Tartalom**:
- Figyelmeztetés a nyersanyagról
- AI Lektor szolgáltatás kártya:
  - Szószám kijelzés
  - Dinamikus ár
  - Funkciók listája
  - Figyelmeztetés a felülírásról
  - Vásárlás gomb
- Ha már van aktív order:
  - Progress bar (fejezetek)
  - Állapot kijelzés

### 2. `useProofreading.ts` hook

**Funkciók**:
- `getOrderStatus()` - aktuális order lekérése
- `calculatePrice(wordCount)` - ár kalkuláció
- `purchaseProofreading()` - vásárlás indítása
- `pollOrderStatus()` - státusz polling

---

## Érintett Fájlok

### Új fájlok

| Fájl | Leírás |
|------|--------|
| `supabase/functions/create-proofreading-purchase/index.ts` | Stripe checkout létrehozása |
| `supabase/functions/proofreading-webhook/index.ts` | Stripe webhook feldolgozása |
| `supabase/functions/process-proofreading/index.ts` | Fejezetek lektorálása |
| `src/components/proofreading/ProofreadingTab.tsx` | UI komponens |
| `src/hooks/useProofreading.ts` | Hook a lektoráláshoz |

### Módosítandó fájlok

| Fájl | Változás |
|------|----------|
| `src/pages/ProjectEditor.tsx` | + Lektor tab hozzáadása |
| `supabase/config.toml` | + Új webhook konfig |

---

## Stripe Konfiguráció

Egy új **dinamikus** Stripe Checkout session kell, ahol az ár futásidőben kerül meghatározásra (`price_data`):

```typescript
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price_data: {
      currency: 'huf',
      product_data: {
        name: `AI Lektorálás - ${projectTitle}`,
        description: `${wordCount.toLocaleString()} szó professzionális lektorálása`,
      },
      unit_amount: price * 100, // Ft -> fillér
    },
    quantity: 1,
  }],
  mode: 'payment',
  // ...
});
```

**Webhook**: Új webhook endpoint szükséges: `STRIPE_PROOFREADING_WEBHOOK_SECRET`

---

## Implementációs Sorrend

1. **Adatbázis**: `proofreading_orders` tábla létrehozása + RLS
2. **Edge Function**: `create-proofreading-purchase` - Stripe checkout
3. **Edge Function**: `proofreading-webhook` - fizetés feldolgozása
4. **Edge Function**: `process-proofreading` - AI lektorálás logika
5. **Frontend**: `ProofreadingTab.tsx` komponens
6. **Frontend**: `useProofreading.ts` hook
7. **Frontend**: Tab hozzáadása a `ProjectEditor.tsx`-hez
8. **Stripe**: Webhook secret konfigurálása

---

## Biztonsági Megfontolások

- RLS policy: Felhasználó csak saját ordereit láthatja
- Webhook signature ellenőrzés
- Order csak egyszer dolgozható fel (idempotencia)
- Rate limiting a lektorálási kérésekre

---

## Várt Eredmény

- A felhasználó értesül, hogy a generált szöveg nyersanyag
- Egy gombnyomással fizet és elindítja a lektorálást
- A háttérben minden fejezet lektorálva lesz
- Az eredeti szöveg felülíródik a javított verzióval
- Email értesítés a befejezésről
