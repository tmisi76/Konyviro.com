
# Stripe Checkout Hiba Javítása

## A Probléma

A Stripe edge function hibát dob:
```
`customer_creation` can only be used in `payment` mode.
```

A `customer_creation: "always"` opció **csak `mode: "payment"` (egyszeri fizetés)** esetén használható. Mi `mode: "subscription"` (előfizetés) módban vagyunk, ahol ez a paraméter nem megengedett.

---

## Megoldás

A `create-checkout` edge function-ből el kell távolítani a `customer_creation` paramétert subscription módban.

**Módosítás a 105. sorban:**

```typescript
// ELŐTTE (hibás):
customer_creation: customerId ? undefined : "always",

// UTÁNA (javított):
// Eltávolítjuk teljesen - subscription módban a Stripe automatikusan kezeli
```

A Stripe subscription módban automatikusan létrehozza a customert, ha:
- Nincs `customer` megadva
- Van `customer_email` megadva

---

## Részletek

### Miért működik ez?

Subscription checkout esetén:
1. Ha nincs customer, de van customer_email → Stripe automatikusan létrehoz egyet
2. A webhook-ban megkapjuk a session.customer ID-t
3. Onnan lekérhetjük az email címet és létrehozhatjuk a Supabase usert

### Módosítandó fájl

| Fájl | Változás |
|------|----------|
| `supabase/functions/create-checkout/index.ts` | `customer_creation` sor törlése |

---

## Javított Kód

```typescript
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  customer_email: customerId ? undefined : userEmail || undefined,
  line_items: [
    {
      price: priceId,
      quantity: 1,
    },
  ],
  mode: "subscription",
  billing_address_collection: "required",
  phone_number_collection: {
    enabled: true,
  },
  // customer_creation ELTÁVOLÍTVA - subscription módban nem támogatott
  success_url: successUrl || `${req.headers.get("origin")}/dashboard?subscription=success`,
  cancel_url: cancelUrl || `${req.headers.get("origin")}/pricing?subscription=cancelled`,
  metadata: {
    supabase_user_id: userId || "guest",
    tier: tier,
    billing_period: billingPeriod,
    is_founder: "true",
  },
  subscription_data: {
    metadata: {
      supabase_user_id: userId || "guest",
      tier: tier,
      billing_period: billingPeriod,
      is_founder: "true",
    },
  },
});
```

---

## Várt Eredmény

A javítás után:
1. ✅ A "REGISZTRÁLOK" gomb kattintásra megnyílik a Stripe Checkout
2. ✅ Guest felhasználók is tudnak fizetni
3. ✅ A Stripe automatikusan létrehozza a customert
4. ✅ A webhook megkapja a customer adatokat és létrehozza a Supabase usert
