

# Terv: Ajánlói (Referral) Rendszer - MÓDOSÍTOTT

## Összefoglaló

Egy affiliate marketing rendszer bevezetése, ahol:
- **MINDEN felhasználó** (ingyenes és fizetős is) kap referral linket
- **Meghívó használatakor**: A meghívó ÉS a meghívott is kap **10.000 szó kreditet**
- **Példa**: Ha valaki 10 usert hoz be → 10 × 10.000 = **100.000 szó kredit**

---

## 1. Adatbázis Változtatások

### 1.1 Új Oszlopok a `profiles` Táblához

| Oszlop | Típus | Leírás |
|--------|-------|--------|
| `referral_code` | `text UNIQUE` | Egyedi meghívó kód (pl. "ABC123") |
| `referred_by` | `uuid` | Ki hívta meg (user_id) |
| `referral_bonus_received` | `boolean` | Kapott-e már bónuszt a meghívásáért |

### 1.2 Új Tábla: `referrals`

Követi a sikeres meghívásokat és jutalmazásokat.

```text
┌─────────────────────────────────────────────────────────┐
│ referrals                                               │
├─────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                        │
│ referrer_id     UUID (aki meghívta)                     │
│ referred_id     UUID (akit meghívtak)                   │
│ referral_code   TEXT (használt kód)                     │
│ referrer_bonus  INTEGER DEFAULT 10000                   │
│ referred_bonus  INTEGER DEFAULT 10000                   │
│ status          TEXT DEFAULT 'completed'                │
│ created_at      TIMESTAMPTZ                             │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Referral Kód Generálás

**MINDEN felhasználónak** automatikusan generálunk egy egyedi kódot regisztrációkor.

**Trigger**: A `handle_new_user` database function-ben, amikor új user jön létre.

```text
Példa kód: "KI7X2M"
Referral link: https://konyviro.com/auth?ref=KI7X2M
```

---

## 3. Folyamat Áttekintése

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REFERRAL FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. BÁRMELY User megosztja a linkjét: konyviro.com/auth?ref=ABC123          │
│                            ↓                                                │
│  2. Új User kattint a linkre                                                │
│                            ↓                                                │
│  3. Frontend eltárolja a ref kódot localStorage-ban                         │
│                            ↓                                                │
│  4. Új User regisztrál (ingyenes vagy fizetős)                              │
│                            ↓                                                │
│  5. Backend ellenőrzi a ref kódot:                                          │
│     - Érvényes-e? (létezik-e user ezzel a kóddal)                           │
│     - Nem saját maga hívta-e meg?                                           │
│                            ↓                                                │
│  6. Ha érvényes:                                                            │
│     - Meghívott kap +10.000 szó extra_words_balance                         │
│     - Meghívó kap +10.000 szó extra_words_balance                           │
│     - Referral record létrehozása                                           │
│                                                                             │
│  PÉLDA: 10 meghívott = 10 × 10.000 = 100.000 szó kredit!                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Frontend Változtatások

### 4.1 Auth Oldal (src/pages/Auth.tsx)

- Referral kód kiolvasása URL-ből (`?ref=ABC123`)
- Eltárolás `localStorage`-ban regisztrációig

### 4.2 RegisterForm (src/components/auth/RegisterForm.tsx)

- Referral kód átadása a `signUp` funkciónak user metadata-ban
- Edge function meghívása regisztráció után

### 4.3 Új Komponens: ReferralCard

Megjelenik a **Beállítások > Előfizetés** oldalon MINDEN usernek.

```text
┌────────────────────────────────────────────────────────┐
│ 🎁 Hívd meg barátaidat!                                │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Oszd meg az ajánló linkedet és mindketten            │
│  kaptok 10.000 szó kreditet!                          │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ https://konyviro.com/auth?ref=KI7X2M   [Másolás] │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Sikeres meghívások: 3                                │
│  Szerzett kreditek: 30.000 szó                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 5. Backend Változtatások

### 5.1 Database Function: `handle_new_user` Módosítás

Referral kód generálás MINDEN új usernek:

```sql
-- Referral kód generálás
NEW.referral_code := upper(substr(md5(random()::text), 1, 6));
```

### 5.2 Új Edge Function: `process-referral`

**Bemenet:**
```json
{
  "new_user_id": "uuid",
  "referral_code": "ABC123"
}
```

**Logika:**
1. Kód validálás (létezik-e user ezzel a kóddal)
2. Nem saját maga-e (self-referral check)
3. Meghívott `extra_words_balance` += 10000
4. Meghívó `extra_words_balance` += 10000
5. `referrals` tábla bejegyzés
6. Email értesítés mindkét félnek (opcionális)

### 5.3 Welcome Email Frissítés

Ha referral kóddal jött, az email tartalmazza:
- "Kaptál 10.000 bónusz szó kreditet meghívás után!"

---

## 6. Új Fájlok

| Fájl | Leírás |
|------|--------|
| `src/hooks/useReferral.ts` | Referral adatok lekérése és statisztikák |
| `src/components/settings/ReferralCard.tsx` | Referral UI komponens |
| `supabase/functions/process-referral/index.ts` | Referral feldolgozás és kredit jóváírás |

---

## 7. Biztonsági Szabályok

| Szabály | Implementáció |
|---------|---------------|
| Nincs önreferral | `referrer_id != referred_id` check |
| Egy user csak egyszer kaphat referral bónuszt | `referral_bonus_received` flag |
| Kód validálás szerver oldalon | Edge function-ben |
| Dupla regisztráció tiltás | Email egyediség (Supabase Auth) |

---

## 8. RLS Szabályok

```sql
-- referrals tábla: Mindenki láthatja a saját meghívásait
CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Csak service role hozhat létre referral rekordot
CREATE POLICY "Service role can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (true);
```

---

## 9. Implementációs Sorrend

1. **Adatbázis migráció**: Új oszlopok és `referrals` tábla
2. **Database function**: `handle_new_user` módosítás (kód generálás)
3. **Edge Function**: `process-referral` létrehozása
4. **Frontend**: Auth oldal referral kód kezelés (URL + localStorage)
5. **Frontend**: RegisterForm módosítás (kód átadása)
6. **Frontend**: ReferralCard komponens a beállításokba
7. **Frontend**: useReferral hook a statisztikákhoz
8. **Backend**: Welcome email frissítés (opcionális)

---

## 10. Konstansok

```typescript
// src/constants/referral.ts
export const REFERRAL_BONUS_WORDS = 10000;
export const REFERRAL_CODE_LENGTH = 6;
```

---

## Összehasonlítás: Régi vs Új Terv

| Szempont | Régi Terv | Új Terv |
|----------|-----------|---------|
| Ki kaphat referral linket | Csak fizetős userek | MINDEN user |
| Referral kód generálás | Előfizetéskor | Regisztrációkor |
| Bónusz összege | 10.000 szó | 10.000 szó (változatlan) |
| Potenciál | Korlátozott | Korlátlan növekedés |

