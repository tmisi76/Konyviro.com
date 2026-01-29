

# Stripe Fizetési Folyamatok Teljes Vizsgálata és Admin Teszt Lektorálás

## 1. Jelenlegi Webhook Architektúra Összefoglalása

A rendszer **4 különböző webhook endpoint**-ot használ különböző fizetési típusokhoz:

| Endpoint | Secret | Típus | Esemény |
|----------|--------|-------|---------|
| `stripe-webhook` | `STRIPE_WEBHOOK_SECRET` | Előfizetés | `checkout.session.completed`, `subscription.*` |
| `credit-webhook` | `STRIPE_CREDIT_WEBHOOK_SECRET` | Szó kredit | `checkout.session.completed` (mode: payment) |
| `audiobook-credit-webhook` | `STRIPE_AUDIOBOOK_WEBHOOK_SECRET` / fallback | Hangoskönyv kredit | `checkout.session.completed` (purchase_type: audiobook_credits) |
| `proofreading-webhook` | `STRIPE_PROOFREADING_WEBHOOK_SECRET` | Lektorálás | `checkout.session.completed` (type: proofreading) |

---

## 2. Webhook Flow-k Részletes Elemzése

### 2.1 Előfizetés Vásárlás (`stripe-webhook`)

**Flow:**
```text
create-checkout → Stripe Checkout → stripe-webhook → Profil frissítés
```

**Működés:**
- Guest checkout: Létrehozza az Auth usert + profilt + csomagot + welcome email
- Logged in: Frissíti a meglévő profilt a csomaggal
- Éves: 12 havi kredit → `extra_words_balance`
- Havi: Standard limit → `monthly_word_limit`

**Kód helyes:** A logika megfelelően kezeli mindkét esetet.

### 2.2 Szó Kredit Vásárlás (`credit-webhook`)

**Flow:**
```text
create-credit-purchase → Stripe Checkout → credit-webhook → add_extra_credits_internal RPC
```

**Működés:**
- Ellenőrzi: `mode === "payment"`
- Hozzáadja: `extra_words_balance` mezőhöz
- Frissíti: `credit_purchases` táblát
- Email: Küld megerősítő emailt

**Kód helyes:** A logika megfelelő.

### 2.3 Hangoskönyv Kredit (`audiobook-credit-webhook`)

**Flow:**
```text
create-audiobook-credit-purchase → Stripe Checkout → audiobook-credit-webhook → add_audiobook_minutes_internal RPC
```

**Működés:**
- Ellenőrzi: `purchase_type === "audiobook_credits"` metadata
- Hozzáadja: `audiobook_minutes_balance` mezőhöz
- Frissíti: `audiobook_credit_purchases` táblát

**Probléma azonosítva:** A webhook `STRIPE_AUDIOBOOK_WEBHOOK_SECRET` secret-et keres, ami **NINCS beállítva** a secrets-ben! Fallback-ként `STRIPE_CREDIT_WEBHOOK_SECRET`-et használ, ami azt jelenti, hogy a credit-webhook endpoint-ra kellene mennie az eseménynek.

### 2.4 Lektorálás (`proofreading-webhook`)

**Flow:**
```text
create-proofreading-purchase → Stripe Checkout → proofreading-webhook → process-proofreading
```

**Működés:**
1. Webhook beérkezik
2. Frissíti `proofreading_orders` táblát: `status: "paid"`
3. Aszinkron hívja: `process-proofreading` edge function
4. `process-proofreading` végigmegy a fejezeteken és Anthropic Claude-dal lektorál

**AI Prompt (jelenlegi a kódban - 9-27. sor):**
```
Te egy professzionális magyar könyvlektor vagy...
- Helyesírási hibák javítása
- Nyelvtani hibák
- Stilisztikai javítások
- Mondatritmus javítása
- Bekezdések tagolása
SZABÁLYOK: Őrizd meg a szerző hangját, ne változtass cselekményt...
```

**Probléma azonosítva:** A modell `claude-sonnet-4-20250514` van beállítva, NEM Opus 4.5!

---

## 3. Azonosított Problémák

### 3.1 Webhook Konfigurációs Problémák

| Probléma | Részletek | Javítás |
|----------|-----------|---------|
| Proofreading webhook nincs hívva | Nincs log a `proofreading-webhook` endpoint-ról | Stripe Dashboard-ban be kell állítani |
| Audiobook webhook secret hiányzik | `STRIPE_AUDIOBOOK_WEBHOOK_SECRET` nincs definiálva | Fallback működik, de nem optimális |
| Credit webhook nincs hívva | Nincs log a `credit-webhook` endpoint-ról | Stripe Dashboard-ban be kell állítani |

### 3.2 AI Modell Probléma

A `process-proofreading/index.ts` jelenleg ezt használja:
```typescript
model: "claude-sonnet-4-20250514"
```

A kérésed szerint Opus 4.5 kellene:
```typescript
model: "claude-opus-4-20250514"
```

### 3.3 Hiányzó Prompt Frissítés

A jelenlegi prompt jó, de a te javaslatod még részletesebb:
- "tartsd meg a szerző eredeti hangját és stílusát"
- "tedd gördülékenyebbé, logikusabbá és természetesebb ritmusúvá"
- "javasolj finom átfogalmazásokat vagy bekezdés-tagolást"

---

## 4. Javasolt Javítások

### 4.1 Stripe Dashboard Konfiguráció (MANUÁLIS)

A következő webhook endpoint-okat kell beállítani a **Stripe Dashboard Live Mode**-ban:

| Endpoint URL | Események | Secret |
|--------------|-----------|--------|
| `.../functions/v1/proofreading-webhook` | `checkout.session.completed` | `STRIPE_PROOFREADING_WEBHOOK_SECRET` |
| `.../functions/v1/credit-webhook` | `checkout.session.completed` | `STRIPE_CREDIT_WEBHOOK_SECRET` |
| `.../functions/v1/audiobook-credit-webhook` | `checkout.session.completed` | Ugyanaz mint credit |

### 4.2 Kód Módosítások

#### A) `process-proofreading/index.ts` - AI Modell és Prompt Frissítés

Frissítendő:
- Modell: `claude-sonnet-4-20250514` → `claude-opus-4-20250514`
- Prompt: A te javaslatod szerinti részletesebb verzió

#### B) `ProofreadingTab.tsx` - Admin Teszt Gomb

Új funkció hozzáadása:
- Admin felhasználóknak megjelenik egy "TESZT Lektorálás (Ingyenes)" gomb
- Ez közvetlenül meghívja a `process-proofreading` edge function-t fizetés nélkül
- Létrehoz egy "test" státuszú order-t a tracking-hez

#### C) Új Edge Function: `admin-test-proofreading`

Új endpoint ami:
- Ellenőrzi az admin jogosultságot
- Létrehoz egy "test" order-t a `proofreading_orders` táblában
- Közvetlenül meghívja a `process-proofreading` function-t

---

## 5. Implementációs Terv

### Fázis 1: AI Modell és Prompt Frissítés

1. **`supabase/functions/process-proofreading/index.ts`**
   - Modell cseréje Opus 4.5-re
   - Prompt frissítése a részletesebb verzióra

### Fázis 2: Admin Teszt Lektorálás

2. **Új Edge Function: `supabase/functions/admin-test-proofreading/index.ts`**
   - Admin jogosultság ellenőrzés
   - Teszt order létrehozása (`status: "test"`)
   - `process-proofreading` meghívása

3. **`supabase/config.toml`**
   - Új function regisztrálása

4. **`src/components/proofreading/ProofreadingTab.tsx`**
   - Admin gomb hozzáadása
   - `useAdmin` hook használata

5. **`src/hooks/useProofreading.ts`**
   - `testProofreading` mutation hozzáadása

---

## 6. Technikai Részletek

### 6.1 Admin Teszt Gomb Működése

```text
┌─────────────────────────────────────────────────────────────┐
│  ProofreadingTab.tsx                                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Lektorálás megvásárlása - 5990 Ft]  ← Normál gomb     ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [🧪 TESZT Lektorálás (Ingyenes)]     ← Admin only       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Frissített Lektorálási Prompt

```typescript
const PROOFREADING_SYSTEM_PROMPT = `Te egy tapasztalt magyar lektor vagy, aki szépirodalmi, ismeretterjesztő és szakmai könyvek szövegét ellenőrzi.

FELADATOD:
Elemezd és javítsd a következő könyvrészletet az alábbi szempontok szerint:
1. Nyelvtan és helyesírás - magyar helyesírási szabályok szerinti javítás
2. Stilisztika - felesleges ismétlődések, klisék kiküszöbölése
3. Mondatszerkezet - gördülékenyebb, logikusabb megfogalmazás
4. Érthetőség - természetesebb ritmus, világos gondolatvezetés
5. Bekezdések - szükség esetén javasolj tagolást

SZABÁLYOK:
- Tartsd meg a szerző eredeti hangját és stílusát
- Tedd gördülékenyebbé, logikusabbá és természetesebb ritmusúvá a szöveget
- Ha szükséges, javasolj finom átfogalmazásokat vagy bekezdés-tagolást
- NE változtasd meg az üzenetet vagy a szerző nézőpontját
- NE adj hozzá új tartalmakat vagy jeleneteket
- NE töröld ki a fontos részeket

A válaszod KIZÁRÓLAG a javított szöveg legyen, semmilyen magyarázat vagy megjegyzés nélkül.`;
```

### 6.3 Admin Teszt Edge Function Vázlat

```typescript
// admin-test-proofreading/index.ts
serve(async (req) => {
  // 1. Ellenőrizd az admin jogosultságot
  // 2. Hozz létre egy teszt order-t (status: "test", amount: 0)
  // 3. Hívd meg a process-proofreading-ot
  // 4. Várd meg a választ és add vissza
});
```

---

## 7. Összefoglaló Táblázat - Mi Működik, Mi Nem

| Funkció | Státusz | Probléma | Javítás |
|---------|---------|----------|---------|
| Előfizetés vásárlás | ✅ Működik | - | - |
| Ingyenes → fizetős upgrade | ✅ Működik | - | - |
| Szó kredit vásárlás | ⚠️ Webhook hiányzik | Stripe config | Manuális beállítás |
| Hangoskönyv kredit | ⚠️ Webhook hiányzik | Stripe config | Manuális beállítás |
| Lektorálás vásárlás | ⚠️ Webhook hiányzik | Stripe config | Manuális beállítás |
| Lektorálás AI modell | ❌ Rossz modell | Sonnet van Opus helyett | Kód módosítás |
| Admin teszt lektorálás | ❌ Nem létezik | Hiányzó funkció | Új feature |

