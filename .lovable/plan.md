

# Stripe Webhook Product Szűrés

## Cél

Hozzáadni egy `PRODUCT_TIER_MAP` vagy `KNOWN_PRICE_IDS` szűrőt a `stripe-webhook`-hoz, hogy ha egy ismeretlen termék (pl. másik app terméke) triggereli a webhook-ot, az ne próbálja feldolgozni, hanem skip-elje.

## Változások

### Fájl: `supabase/functions/stripe-webhook/index.ts`

**1. `KNOWN_PRICE_IDS` map hozzáadása (a TIER_LIMITS után)**

Ugyanazokat a price ID-kat használjuk, mint a `check-subscription`-ben:
- `price_1Ss3QZBqXALGTPIr0z2uRD0a` → hobby (yearly)
- `price_1Ss3QbBqXALGTPIrjbB9lSCI` → writer (yearly)
- `price_1Ss3QcBqXALGTPIrStgzIXPu` → pro (yearly)
- `price_1Ss8bGBqXALGTPIrOVHTHBPA` → hobby (monthly)
- `price_1Ss8bHBqXALGTPIrEmUEe1Gw` → writer (monthly)

**2. `checkout.session.completed` eseménynél** — a session line_items-ből vagy a subscription-ből kinyerni a price ID-t, és ha nem szerepel a map-ben, skip-elni:

```
// After getting the session object
if (session.subscription) {
  const sub = await stripe.subscriptions.retrieve(session.subscription);
  const priceId = sub.items.data[0]?.price?.id;
  if (priceId && !KNOWN_PRICE_IDS[priceId]) {
    logStep("Unknown product, skipping", { priceId });
    break;
  }
}
```

**3. `customer.subscription.updated` és `customer.subscription.deleted` eseményeknél** — szintén ellenőrizni a price ID-t a subscription items-ből, és ismeretlen termék esetén skip-elni.

**4. Deploy** — edge function újratelepítése.

## Hatás

| Esemény | Ismert termék | Ismeretlen termék |
|---------|--------------|-------------------|
| checkout.session.completed | Normál feldolgozás | Skip + log |
| subscription.updated | Normál feldolgozás | Skip + log |
| subscription.deleted | Normál feldolgozás | Skip + log |
| invoice.payment_failed | Customer ID alapú (marad) | Csak ha van profile |

