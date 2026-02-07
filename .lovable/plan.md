
# Terv: Affiliate Admin Panel

## Összefoglaló

Új admin oldal létrehozása `/admin/affiliates` útvonalon, ahol az adminisztrátorok:
1. Látják az összes ajánlót és az általuk behozott felhasználókat
2. Gyanús mintákat (pl. sok regisztráció rövid idő alatt, hasonló email címek) észlelhetnek
3. Egyetlen kattintással letilthatják az ajánlót ÉS az összes általa behozott felhasználót

---

## 1. Adatbázis Bővítés

### 1.1 Új mezők a `referrals` táblához

| Mező | Típus | Leírás |
|------|-------|--------|
| ip_address | inet | Regisztráláskor rögzített IP (csalás detektáláshoz) |
| is_fraud | boolean | Megjelölve csalásként |
| fraud_reason | text | Csalás oka (opcionális) |
| banned_at | timestamptz | Mikor lett tiltva (NULL = nem tiltott) |

### 1.2 Új mezők a `profiles` táblához

| Mező | Típus | Leírás |
|------|-------|--------|
| referral_banned | boolean | Az ajánlói jogok letiltva |
| referral_ban_reason | text | Tiltás oka |

---

## 2. Új Admin Oldal: `/admin/affiliates`

### 2.1 Oldal Struktúra

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Affiliate Kezelő                                    [Export CSV]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Statisztika Kártyák:                                                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│  │ Összes     │ │ Sikeres    │ │ Kiosztott  │ │ Gyanús     │            │
│  │ Ajánló     │ │ Ajánlások  │ │ Bónusz     │ │ Aktivitás  │            │
│  │    123     │ │    456     │ │  4.56M szó │ │     12     │            │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘            │
│                                                                         │
│  Szűrők: [Keresés...] [Státusz ▾] [Rendezés ▾]                         │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Ajánló            │ Kód    │ Behozva │ Bónusz │ Gyanús │ Művelet  │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ ⚠ test@mail.com  │ ABC123 │   15    │ 150K   │  ⚠ 3   │ [▾]      │  │
│  │   user@mail.com  │ DEF456 │    2    │  20K   │   -    │ [▾]      │  │
│  │ 🚫banned@mail.com│ GHI789 │    8    │  80K   │  all   │ [▾]      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Ajánló Részletek Modal

Kattintásra megnyílik egy részletes nézet:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Ajánló: test@example.com                                   [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Ajánlói kód: ABC123                                            │
│  Regisztrált: 2026-01-15                                        │
│  Összes ajánlás: 15                                             │
│  Kiosztott bónusz: 150,000 szó                                  │
│                                                                 │
│  ⚠ GYANÚS JELZÉSEK:                                            │
│  • 8 regisztráció 24 órán belül                                 │
│  • 3 email +alias használattal                                  │
│  • 5 azonos IP címről                                           │
│                                                                 │
│  Behozott felhasználók:                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Email              │ IP       │ Dátum    │ Gyanús │ [✓] │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ user1@mail.com     │ 1.2.3.4  │ 02-01    │   -    │ [ ] │    │
│  │ user1+1@mail.com   │ 1.2.3.4  │ 02-01    │   ⚠   │ [✓] │    │
│  │ user1+2@mail.com   │ 1.2.3.4  │ 02-01    │   ⚠   │ [✓] │    │
│  │ fake@temp.com      │ 1.2.3.4  │ 02-01    │   ⚠   │ [✓] │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [Kiválasztottak tiltása]  [Mind tiltása + Ajánló]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Csalás Detektáló Logika

### 3.1 Gyanús Minták (automatikusan jelölve)

| Minta | Súlyosság | Leírás |
|-------|-----------|--------|
| Email alias (+) | Közepes | Ugyanaz az email + számmal (user+1@) |
| Azonos IP | Magas | 3+ regisztráció ugyanarról az IP-ről |
| Gyors regisztrációk | Magas | 5+ ajánlás 24 órán belül |
| Temp email domain | Magas | Ismert temp email szolgáltatók |
| Hasonló email pattern | Közepes | user1, user2, user3 stb. |

### 3.2 Gyanússági Pontszám

Minden ajánlóhoz kiszámítjuk:
```
suspicion_score = 
  (alias_count * 2) + 
  (same_ip_count * 3) + 
  (rapid_registrations * 2) + 
  (temp_email_count * 4)
```

Megjelenítés:
- 0-2: Zöld (OK)
- 3-5: Sárga (Figyelni kell)
- 6+: Piros (Valószínű csalás)

---

## 4. Edge Function: `admin-ban-referrer`

Új edge function a tömeges tiltáshoz:

**Bemeneti paraméterek:**
```typescript
{
  referrer_id: string;        // Az ajánló user_id-ja
  ban_referrer: boolean;      // Ajánló is letiltandó?
  ban_referred_ids: string[]; // Tiltandó behozott user_id-k
  reason: string;             // Tiltás oka
}
```

**Műveletek:**
1. Ajánló tiltása (opcionális):
   - `profiles.referral_banned = true`
   - `profiles.subscription_status = 'banned'`
   - Auth ban beállítása
   
2. Behozott felhasználók tiltása:
   - Mindegyik `profiles.subscription_status = 'banned'`
   - Auth ban beállítása
   
3. Bónuszok visszavonása (opcionális):
   - `profiles.extra_words_balance` csökkentése
   
4. Naplózás:
   - `admin_activity_logs` bejegyzés

---

## 5. Új Hook: `useAdminAffiliates`

```typescript
interface Referrer {
  user_id: string;
  email: string;
  full_name: string | null;
  referral_code: string;
  referrals_count: number;
  total_bonus_given: number;
  suspicious_count: number;
  suspicion_score: number;
  is_banned: boolean;
  created_at: string;
}

interface ReferralDetail {
  id: string;
  referred_id: string;
  referred_email: string;
  referred_name: string | null;
  ip_address: string | null;
  created_at: string;
  is_suspicious: boolean;
  suspicion_reasons: string[];
}
```

---

## 6. Új Fájlok

| Fájl | Leírás |
|------|--------|
| `src/pages/admin/AdminAffiliates.tsx` | Fő oldal komponens |
| `src/hooks/admin/useAdminAffiliates.ts` | Adatlekérő hook |
| `src/components/admin/ReferrerDetailModal.tsx` | Részletes nézet modal |
| `src/components/admin/BanReferrerModal.tsx` | Tiltás megerősítő modal |
| `supabase/functions/admin-ban-referrer/index.ts` | Tiltás edge function |
| `supabase/functions/admin-get-affiliates/index.ts` | Adatlekérő edge function |

---

## 7. Navigáció Frissítés

Az `AdminLayout.tsx`-ben új menüpont:

```typescript
{
  section: "Főmenü",
  items: [
    // ... meglévő elemek
    { name: "Affiliate", href: "/admin/affiliates", icon: Users2 },
  ],
},
```

---

## 8. Routing Frissítés

Az `App.tsx`-ben új route:

```tsx
<Route
  path="/admin/affiliates"
  element={
    <ProtectedRoute>
      <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
        <AdminLayout>
          <AdminAffiliates />
        </AdminLayout>
      </Suspense>
    </ProtectedRoute>
  }
/>
```

---

## 9. Adatbázis Migráció

```sql
-- Új mezők a referrals táblához
ALTER TABLE referrals ADD COLUMN ip_address inet;
ALTER TABLE referrals ADD COLUMN is_fraud boolean DEFAULT false;
ALTER TABLE referrals ADD COLUMN fraud_reason text;
ALTER TABLE referrals ADD COLUMN banned_at timestamptz;

-- Index a gyors lekérdezéshez
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_is_fraud ON referrals(is_fraud);

-- Új mezők a profiles táblához
ALTER TABLE profiles ADD COLUMN referral_banned boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN referral_ban_reason text;
```

---

## 10. Implementációs Sorrend

1. **Adatbázis migráció** - Új mezők hozzáadása
2. **Edge function: admin-get-affiliates** - Adatlekérés
3. **Hook: useAdminAffiliates** - Frontend adatkezelés
4. **Oldal: AdminAffiliates.tsx** - UI megjelenítés
5. **Modal: ReferrerDetailModal** - Részletes nézet
6. **Edge function: admin-ban-referrer** - Tiltás logika
7. **Modal: BanReferrerModal** - Tiltás megerősítés
8. **Navigáció és routing** - Integráció

---

## 11. Biztonsági Megfontolások

- Minden edge function ellenőrzi az admin jogosultságot
- A tiltások naplózva vannak az `admin_activity_logs` táblában
- Az IP címek csak adminok számára láthatók
- GDPR megfelelőség: IP címek anonimizálása X nap után (opcionális)
