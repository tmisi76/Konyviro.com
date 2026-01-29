
# Javítási Terv: Előfizetések Manuális Beállítása + Webhook Hibaelhárítás

## Probléma Összefoglalása

A Stripe-ban 3 sikeres előfizetés van, de a felhasználók profiljai nem frissültek:
- A `stripe-webhook` Edge Function nem kapott hívást (nincs log)
- A Stripe Dashboard-ban valószínűleg nincs beállítva a webhook URL

## Érintett Felhasználók

| Email | Supabase User ID | Stripe Customer | Csomag | Éves szó kredit |
|-------|------------------|-----------------|--------|-----------------|
| ninalamar.author@gmail.com | cd86cd73-c4ea-42e6-b730-978effb24abb | cus_Tsi8ZSFlQQhqnw | hobby | 1 200 000 szó |
| schukkert.andrea@gmail.com | fcadca77-e449-49a7-a5f1-c7a958c3d772 | cus_TsdCyC0lwArGMx | writer | 3 000 000 szó |
| ladanyibeata@gmail.com | a6b1cdd1-3394-4bcb-bd02-a825678201aa | cus_TsdUZFLuogrVW4 | writer | 3 000 000 szó |

## Megoldás

### 1. Manuális Profil Frissítések (azonnali)

SQL UPDATE utasítások a 3 felhasználó profiljának javítására:

**Hobbi éves (ninalamar.author@gmail.com)**:
```sql
UPDATE profiles SET
  subscription_tier = 'hobby',
  subscription_status = 'active',
  billing_period = 'yearly',
  is_founder = true,
  founder_discount_applied = true,
  subscription_start_date = '2026-01-29T16:03:00Z',
  subscription_end_date = '2027-01-29T16:03:00Z',
  stripe_customer_id = 'cus_Tsi8ZSFlQQhqnw',
  stripe_subscription_id = 'sub_1SuwkfBqXALGTPIrkuK6HWfQ',
  project_limit = 5,
  monthly_word_limit = 0,
  extra_words_balance = 1200000,
  storybook_credit_limit = 1
WHERE user_id = 'cd86cd73-c4ea-42e6-b730-978effb24abb';
```

**Profi éves (schukkert.andrea@gmail.com)**:
```sql
UPDATE profiles SET
  subscription_tier = 'writer',
  subscription_status = 'active',
  billing_period = 'yearly',
  is_founder = true,
  founder_discount_applied = true,
  subscription_start_date = '2026-01-29T14:27:00Z',
  subscription_end_date = '2027-01-29T14:27:00Z',
  stripe_customer_id = 'cus_TsdCyC0lwArGMx',
  stripe_subscription_id = 'sub_1SuvFwBqXALGTPIrVYqwujB1',
  project_limit = 50,
  monthly_word_limit = 0,
  extra_words_balance = 3000000,
  storybook_credit_limit = 5
WHERE user_id = 'fcadca77-e449-49a7-a5f1-c7a958c3d772';
```

**Profi éves (ladanyibeata@gmail.com)**:
```sql
UPDATE profiles SET
  subscription_tier = 'writer',
  subscription_status = 'active',
  billing_period = 'yearly',
  is_founder = true,
  founder_discount_applied = true,
  subscription_start_date = '2026-01-29T11:12:00Z',
  subscription_end_date = '2027-01-29T11:12:00Z',
  stripe_customer_id = 'cus_TsdUZFLuogrVW4',
  stripe_subscription_id = 'sub_1SusDHBqXALGTPIr3OB9csS9',
  project_limit = 50,
  monthly_word_limit = 0,
  extra_words_balance = 3000000,
  storybook_credit_limit = 5
WHERE user_id = 'a6b1cdd1-3394-4bcb-bd02-a825678201aa';
```

### 2. Stripe Webhook Konfiguráció (kézi lépés)

**A Stripe Dashboard-ban be kell állítani:**

1. Nyisd meg: https://dashboard.stripe.com/webhooks
2. Kattints "Add endpoint"
3. **Endpoint URL**: `https://qdyneottmnulmkypzmtt.supabase.co/functions/v1/stripe-webhook`
4. **Events to listen**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Mentés után **másold ki a Signing Secret**-et
6. Frissítsd a `STRIPE_WEBHOOK_SECRET` értékét a projekt secrets-ben

## Technikai Részletek

### Éves előfizetés kreditszámítás

| Csomag | Havi limit | Éves kredit (12×) |
|--------|-----------|-------------------|
| Hobby | 100 000 szó | 1 200 000 szó |
| Writer/Profi | 250 000 szó | 3 000 000 szó |

Éves előfizetésnél:
- `monthly_word_limit = 0`
- `extra_words_balance = havi_limit × 12`

### Érintett fájlok

Nincs kódmódosítás szükséges, csak:
1. **Adatbázis**: UPDATE utasítások végrehajtása
2. **Stripe Dashboard**: Webhook beállítása (manuális)
3. **Secrets**: `STRIPE_WEBHOOK_SECRET` frissítése (ha szükséges)

## Implementációs Sorrend

1. SQL UPDATE utasítások végrehajtása a 3 felhasználóra
2. Ellenőrzés, hogy a profilok frissültek
3. Stripe webhook beállításának ellenőrzése/javítása
