
# Stripe Webhook Javítás: constructEventAsync

## Probléma Összefoglalása

A Stripe SDK 18.x verzióban a `constructEvent()` metódus nem működik szinkron kontextusban Deno Edge Runtime-ban. A hiba:
```
SubtleCryptoProvider cannot be used in a synchronous context.
Use `await constructEventAsync(...)` instead of `constructEvent(...)`
```

**Következmény:** A sikeres fizetések után a webhook elbukik, így:
- A felhasználók "free" tier-en maradnak
- Guest checkout esetén a user nem jön létre
- A Stripe customer/subscription ID nem kerül be a profilba

---

## Javítás

### 1. `stripe-webhook/index.ts` módosítása

**Változás (55. sor):**
```typescript
// RÉGI (hibás):
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

// ÚJ (javított):
const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
```

### 2. Edge Function újra-deployolása

A javítás után azonnal deployolni kell a `stripe-webhook` függvényt.

---

## Érintett Felhasználók Kézi Javítása

A már elromlott fizetések kézi javítást igényelnek:

### pappkaroly55@gmail.com (user_id: 4572a4c3-9018-4091-9e00-312a26a8e395)
- Ft29,940 = **Hobby tier éves** (Ft29,940 / 12 = ~Ft2,495/hó)
- Stripe Customer ID: `cus_Ts38cWEWDnEceX`

**SQL Update:**
```sql
UPDATE profiles SET
  subscription_tier = 'hobby',
  subscription_status = 'active',
  billing_period = 'yearly',
  stripe_customer_id = 'cus_Ts38cWEWDnEceX',
  monthly_word_limit = 0,
  extra_words_balance = 1200000,  -- 100k * 12 hónap
  project_limit = 5,
  storybook_credit_limit = 1,
  subscription_start_date = '2026-01-27T20:39:00Z',
  subscription_end_date = '2027-01-27T20:39:00Z'
WHERE user_id = '4572a4c3-9018-4091-9e00-312a26a8e395';
```

### valeria.andocsi@gmail.com (nem létezik!)
- Ft89,940 = **Profi (writer) tier éves** (Ft89,940 / 12 = ~Ft7,495/hó)
- Stripe Customer ID: `cus_TsAmFSxWPWzoCz`

**Admin felületen:**
1. Hozzuk létre a felhasználót manuálisan
2. Állítsuk be a Profi tier-t és a helyes krediteket

---

## Árképzés Ellenőrzése

A Stripe screenshot alapján:
- **Ft29,940** → Hobby éves
- **Ft89,940** → Profi éves

Ez megegyezik a jelenlegi árazással (Ft2,495/hó hobby, Ft7,495/hó profi - 50% founder kedvezménnyel).

---

## Érintett Fájlok

| Fájl | Változás |
|------|----------|
| `supabase/functions/stripe-webhook/index.ts` | `constructEvent` → `constructEventAsync` |

---

## Tesztelési Lépések

1. Webhook javítás után deployolás
2. Teszt fizetés indítása
3. Webhook logok ellenőrzése
4. Profil frissülésének ellenőrzése
