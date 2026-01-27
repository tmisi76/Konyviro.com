
# Pricing Table Módosítás - Közvetlen Stripe Checkout

## Cél

A fizetős csomagoknál a gomb kattintásra azonnal Stripe Checkout-ra viszi a felhasználót, ahol:
- Megadhatja az email címét (regisztráció is ott történik)
- Megadhatja a számlázási címet és minden adatot
- Fizethet
- Gomb szöveg: "REGISZTRÁLOK"

---

## Változtatások

### 1. Frontend: PricingSection.tsx

| Jelenlegi viselkedés | Új viselkedés |
|---------------------|---------------|
| Ha nincs bejelentkezve → `/auth?redirect=/pricing` | Ha nincs bejelentkezve → közvetlen Stripe checkout (guest mode) |
| Gomb szöveg: "Lefoglalom" / "Előfizetek" | Gomb szöveg: "REGISZTRÁLOK" |

**Módosítandó kód (28-46. sor):**
```tsx
const handlePlanSelect = async (plan: typeof SUBSCRIPTION_PLANS[0]) => {
  // Free plan - regisztrációs oldalra
  if (plan.isFree) {
    navigate("/auth?mode=register");
    return;
  }

  // Fizetős csomagok - közvetlen Stripe checkout (guest vagy bejelentkezett)
  const priceId = billingPeriod === "yearly" ? plan.yearlyPriceId : plan.monthlyPriceId;
  if (priceId) {
    createCheckoutSession(priceId, plan.id as "hobby" | "writer" | "pro");
  }
};
```

**Gomb szövegek (118, 135. sor):**
- Ingyenes: `ctaText="REGISZTRÁLOK"`
- Fizetős: `ctaText="REGISZTRÁLOK"`

---

### 2. Frontend: useCheckout.ts

Módosítani, hogy bejelentkezés nélkül is működjön (guest checkout):

```tsx
const createCheckoutSession = async (
  priceId: string,
  tier: SubscriptionTier
) => {
  setIsLoading(true);

  try {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        priceId,
        tier,
        successUrl: `${window.location.origin}/dashboard?subscription=success`,
        cancelUrl: `${window.location.origin}/pricing?subscription=cancelled`,
      },
    });

    if (error) throw error;

    if (data?.url) {
      window.location.href = data.url;
    } else {
      throw new Error("No checkout URL returned");
    }
  } catch (error) {
    console.error("Checkout error:", error);
    toast.error("Hiba történt a fizetés indításakor. Kérlek próbáld újra!");
  } finally {
    setIsLoading(false);
  }
};
```

---

### 3. Backend: create-checkout Edge Function

Módosítások:
1. Autentikáció opcionális (guest checkout támogatás)
2. `billing_address_collection: "required"` - kötelező számlázási cím
3. `phone_number_collection: { enabled: true }` - telefonszám gyűjtés
4. `customer_creation: "always"` - mindig hoz létre Stripe customert

**Új checkout session konfiguráció:**
```typescript
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  customer_email: customerId ? undefined : userEmail,
  line_items: [
    {
      price: priceId,
      quantity: 1,
    },
  ],
  mode: "subscription",
  billing_address_collection: "required",  // ÚJ: Kötelező számlázási cím
  phone_number_collection: {
    enabled: true,  // ÚJ: Telefonszám gyűjtés
  },
  customer_creation: customerId ? undefined : "always",  // ÚJ: Guest esetén is létrejön customer
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: {
    supabase_user_id: userId || "guest",
    tier: tier,
    is_founder: "true",
  },
  subscription_data: {
    metadata: {
      supabase_user_id: userId || "guest",
      tier: tier,
      is_founder: "true",
    },
  },
});
```

---

## Összefoglalás

| Fájl | Módosítás |
|------|-----------|
| `src/components/pricing/PricingSection.tsx` | Bejelentkezés ellenőrzés eltávolítása, gomb szöveg → "REGISZTRÁLOK" |
| `src/hooks/useCheckout.ts` | User ellenőrzés eltávolítása (guest checkout) |
| `supabase/functions/create-checkout/index.ts` | Opcionális auth, billing_address_collection, phone gyűjtés |

---

## Stripe Checkout Élmény

A felhasználó a Stripe oldalon tudja megadni:
- ✅ Email cím
- ✅ Kártyaadatok
- ✅ Számlázási cím (kötelező)
- ✅ Telefonszám
- ✅ Név
