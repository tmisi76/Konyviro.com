

# Dr. Varga-Nagy Adrienn Előfizetés Aktiválása

## Összefoglaló

A felhasználó fizetése **sikeres** volt a Stripe-ban, de a **webhook nem futott le**, ezért a profilja nem lett frissítve. Manuálisan kell aktiválni az előfizetését.

---

## Felhasználó Adatai

| Mező | Érték |
|------|-------|
| Név | Dr. Varga-Nagy Adrienn |
| Email | nagyadrienn986@gmail.com |
| User ID | 1c9bd1e2-e2dc-4afb-a8de-3eaeb384a8bf |
| Stripe Customer | cus_Ts1Q5TfJPrcbji |
| Stripe Subscription | sub_1SuHPtBqXALGTPIrDWmVmmt8 |
| Csomag | Hobbi Alapító (éves) |
| Ár | 29,940 Ft |

---

## 1. Profil Manuális Frissítése

SQL parancs az előfizetés aktiválásához:

```sql
UPDATE public.profiles
SET 
  subscription_tier = 'hobby',
  subscription_status = 'active',
  billing_period = 'yearly',
  is_founder = true,
  founder_discount_applied = true,
  stripe_customer_id = 'cus_Ts1Q5TfJPrcbji',
  stripe_subscription_id = 'sub_1SuHPtBqXALGTPIrDWmVmmt8',
  subscription_start_date = '2026-01-27T18:52:31Z',
  subscription_end_date = '2027-01-27T18:52:31Z',
  project_limit = 5,
  monthly_word_limit = 0,
  extra_words_balance = 1200000,
  storybook_credit_limit = 1,
  storybook_credits_used = 0,
  last_credit_reset = NOW(),
  updated_at = NOW()
WHERE user_id = '1c9bd1e2-e2dc-4afb-a8de-3eaeb384a8bf';
```

### Miért ezek az értékek?

| Mező | Érték | Magyarázat |
|------|-------|------------|
| subscription_tier | hobby | Hobbi csomag |
| billing_period | yearly | Éves előfizetés |
| monthly_word_limit | 0 | Éves előfizetésnél 0 (minden a balance-ban) |
| extra_words_balance | 1,200,000 | 12 hónap × 100,000 szó |
| storybook_credit_limit | 1 | Hobbi: 1 mesekönyv/hó |
| subscription_end_date | 2027-01-27 | 1 évvel a vásárlás után |

---

## 2. Webhook Konfigurálás Ellenőrzése

**KRITIKUS**: A Stripe Dashboard-ban ellenőrizd, hogy a webhook be van-e állítva!

**Lépések:**
1. Menj ide: https://dashboard.stripe.com/webhooks
2. Ellenőrizd, hogy létezik-e webhook erre az URL-re:
   ```
   https://qdyneottmnulmkypzmtt.supabase.co/functions/v1/stripe-webhook
   ```
3. Ha nincs, hozd létre ezekkel az eseményekkel:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

4. A webhook Signing secret-jét másold be a Lovable Cloud secrets-be `STRIPE_WEBHOOK_SECRET` néven

---

## 3. Email Küldés a Felhasználónak

A felhasználó **már be tud lépni**, mert a fiókja létezik (valószínűleg manuálisan regisztrált). Viszont az előfizetése nem volt aktív.

A frissítés után a felhasználónak jelezni kell, hogy:
- Az előfizetése aktiválva lett
- Bejelentkezhet és használhatja a Hobbi funkciót
- 1,200,000 szó kreditet kapott az éves előfizetéshez

---

## Végrehajtandó Lépések Sorrendben

1. ✅ **Profil frissítése** - SQL parancs futtatása
2. ⚠️ **Webhook ellenőrzése** - Stripe Dashboard-ban
3. 📧 **Felhasználó értesítése** - Email vagy más módon

