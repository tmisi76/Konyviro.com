
# Terv: Hangoskönyv Kredit Rendszer & Árazás

## Összefoglaló

ElevenLabs API árazás alapján dolgozzuk ki a hangoskönyv kredit rendszert:
- **Egyik csomagban sincs alapból hangoskönyv kredit** (0 kredit alap)
- **Külön vásárolható kredit csomagok** a hangoskönyvekhez
- **4x API költség** az árazáshoz
- Az előfizetési csomag max 25%-a lehet a költség

---

## ElevenLabs Árazás Elemzése

Az ElevenLabs oldalról:
- **Creator terv ($22/hó)**: 100k kredit = ~100 perc audio = **~$0.22/perc**
- **Pro terv ($99/hó)**: 500k kredit = ~500 perc audio = **~$0.20/perc**
- **Scale terv ($330/hó)**: 2M kredit = ~2,000 perc audio = **~$0.165/perc**
- **Business terv**: ~$0.12/perc

Átlagos könyv kalkuláció:
| Könyv típus | Szó | Karakter | Audio idő |
|-------------|-----|----------|-----------|
| Novella | 20,000 | ~100,000 | ~40 perc |
| Regény | 50,000 | ~250,000 | ~100 perc |
| Nagyregény | 100,000 | ~500,000 | ~200 perc |

---

## Árazási Kalkuláció

### ElevenLabs API Költség (Pro terv: $0.20/perc)

| Könyv típus | Audio | API költség | 4x ár (eladási) |
|-------------|-------|-------------|-----------------|
| Novella (40 perc) | 40 perc | ~$8 (~3,200 Ft) | ~$32 (~12,800 Ft) |
| Regény (100 perc) | 100 perc | ~$20 (~8,000 Ft) | ~$80 (~32,000 Ft) |
| Nagyregény (200 perc) | 200 perc | ~$40 (~16,000 Ft) | ~$160 (~64,000 Ft) |

*Árfolyam: 1 USD = ~400 HUF*

### Előfizetési Csomag Ellenőrzés (max 25% költség)

| Csomag | Éves ár | 25% költségkeret | Elég könyvre? |
|--------|---------|------------------|---------------|
| HOBBI (éves) | 29,940 Ft | 7,485 Ft | ~3 novella API költsége |
| PROFI (éves) | 89,940 Ft | 22,485 Ft | ~2-3 regény API költsége |
| PRO (éves) | 179,940 Ft | 44,985 Ft | ~5 regény API költsége |

**Következtetés**: A 4x árazás mellett nem tudunk ingyen audio creditet adni a csomagokhoz anélkül, hogy túllépnénk a 25%-os költségkeretet. Ezért **minden hangoskönyv kredit külön vásárolandó**.

---

## Új Kredit Rendszer: "Audiobook Minutes"

### Mértékegység: Hangoskönyv Percek

1 perc audio = 1 kredit

### Kredit Csomagok

| Csomag | Percek | ElevenLabs költség | 4x eladási ár | Per perc |
|--------|--------|-------------------|---------------|----------|
| Alap | 30 perc | ~$6 (2,400 Ft) | **9,990 Ft** | 333 Ft/perc |
| Népszerű | 100 perc | ~$20 (8,000 Ft) | **29,990 Ft** | 300 Ft/perc |
| Profi | 250 perc | ~$50 (20,000 Ft) | **69,990 Ft** | 280 Ft/perc |

*A 4x szorzó miatt jó margó marad (75%)*

---

## Adatbázis Változások

### Új mezők a `profiles` táblában:

```sql
ALTER TABLE profiles ADD COLUMN audiobook_minutes_balance INTEGER DEFAULT 0;
```

### Új tábla: `audiobook_credit_purchases`

```sql
CREATE TABLE audiobook_credit_purchases (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  stripe_session_id TEXT NOT NULL,
  minutes_purchased INTEGER NOT NULL,
  amount INTEGER NOT NULL, -- Forintban
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

---

## Új Fájlok

### Frontend

```
src/constants/audiobookCredits.ts       # Kredit költségek és csomagok
src/components/audiobook/BuyAudiobookCreditModal.tsx  # Kredit vásárlás modal
src/hooks/useAudiobookCredits.ts        # Kredit kezelés hook
```

### Backend

```
supabase/functions/create-audiobook-credit-purchase/  # Stripe checkout
supabase/functions/audiobook-credit-webhook/          # Webhook handler
```

---

## Kredit Fogyasztás Logika

### Hangoskönyv generálás előtt:

1. Kiszámítjuk a szöveg karakterszámát
2. Becsült percek = karakterszám / 1000 (kb. 1000 karakter = 1 perc)
3. Ellenőrizzük van-e elég kredit
4. Ha nincs → megjelenítjük a vásárlás modalt
5. Ha van → levonjuk és elindítjuk a generálást

### Pontos fogyasztás:

A generálás végén a tényleges audio hossz alapján korrigáljuk (ha rövidebb lett, visszaadjuk a különbséget).

---

## UI Változások

### 1. AudiobookTab-ban:

- Kredit egyenleg megjelenítése
- "Kredit vásárlás" gomb
- Becsült költség megjelenítése generálás előtt

### 2. UsagePanel-ben (Dashboard):

- Hangoskönyv kredit egyenleg
- "Kredit vásárlás" link

### 3. Új Modal: BuyAudiobookCreditModal

Hasonló a meglévő BuyCreditModal-hoz, de percekre vonatkozik.

---

## Implementáció Sorrendje

### Fázis 1: Adatbázis

1. Új mező: `profiles.audiobook_minutes_balance`
2. Új tábla: `audiobook_credit_purchases`
3. RPC függvény: `use_audiobook_minutes(p_minutes INTEGER)`

### Fázis 2: Kredit Konstansok

4. `src/constants/audiobookCredits.ts` - csomagok és árak

### Fázis 3: Backend

5. `create-audiobook-credit-purchase` edge function
6. `audiobook-credit-webhook` edge function (ha szükséges, vagy a meglévő credit-webhook bővítése)

### Fázis 4: Frontend

7. `useAudiobookCredits.ts` hook
8. `BuyAudiobookCreditModal.tsx` komponens
9. `AudiobookTab.tsx` frissítés (kredit ellenőrzés, megjelenítés)
10. `UsagePanel.tsx` frissítés

### Fázis 5: Generálás Integrálása

11. `start-audiobook-generation` frissítés (kredit ellenőrzés)
12. Kredit levonás a tényleges audio hossz alapján

---

## Stripe Termékek

Létre kell hozni 3 új Stripe terméket:

1. **Audiobook Credits - 30 perc** - 9,990 Ft
2. **Audiobook Credits - 100 perc** - 29,990 Ft
3. **Audiobook Credits - 250 perc** - 69,990 Ft

---

## Biztonsági Szempontok

- Kredit levonás service role-lal
- RPC függvény `auth.uid()` alapú
- Rate limiting a generálás endpoint-on
- Webhook signature verification

---

## Összefoglaló

| Elem | Érték |
|------|-------|
| ElevenLabs költség | ~$0.20/perc (~80 Ft) |
| Eladási ár | ~300 Ft/perc (4x) |
| Legkisebb csomag | 30 perc = 9,990 Ft |
| Legnagyobb csomag | 250 perc = 69,990 Ft |
| Előfizetésben | 0 perc (külön vásárolandó) |
| Margó | ~75% |
