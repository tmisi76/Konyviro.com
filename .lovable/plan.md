

# Stripe Fizetési Folyamat Teljes Átdolgozása

## A Probléma Azonosítása

Teszteltem a rendszert:
- **create-checkout edge function**: ✅ Működik, visszaadja a Stripe checkout URL-t
- **stripe-webhook**: ❌ Guest checkout után nem hozza létre a felhasználót

A jelenlegi webhook feltételezi, hogy már létezik a user, de vendég vásárlásnál nincs fiók!

---

## Megoldási Terv

### 1. create-checkout Edge Function módosítás

Átadjuk a `billing_period` (yearly/monthly) paramétert is a metadatában:

```typescript
metadata: {
  supabase_user_id: userId || "guest",
  tier: tier,
  billing_period: billingPeriod,  // ÚJ
  is_founder: "true",
}
```

**Fájl**: `supabase/functions/create-checkout/index.ts`

---

### 2. useCheckout.ts módosítás

A billing period átadása:

```typescript
createCheckoutSession(priceId, tier, billingPeriod)
```

**Fájl**: `src/hooks/useCheckout.ts`

---

### 3. PricingSection.tsx módosítás

Billing period átadása a checkout hívásnak:

```typescript
createCheckoutSession(priceId, plan.id, billingPeriod)
```

**Fájl**: `src/components/pricing/PricingSection.tsx`

---

### 4. stripe-webhook Edge Function - KRITIKUS ÁTDOLGOZÁS

Ez a legfontosabb rész! A `checkout.session.completed` esemény kezelésekor:

**A) Ha guest checkout:**
1. Lekérjük a Stripe customer adatait (email, név, cím, telefon)
2. Supabase Auth-tal létrehozunk egy új felhasználót (véletlenszerű jelszóval)
3. Létrehozzuk a profilt a megfelelő csomaggal
4. Küldünk egy jelszó-beállító emailt

**B) Kredit logika:**
- **Éves előfizetés**: `monthly_word_limit = 0`, `extra_words_balance = tier_limit * 12`
- **Havi előfizetés**: `monthly_word_limit = tier_limit`, `extra_words_balance = 0`

```typescript
case "checkout.session.completed": {
  const session = event.data.object as Stripe.Checkout.Session;
  let userId = session.metadata?.supabase_user_id;
  const tier = session.metadata?.tier as string;
  const billingPeriod = session.metadata?.billing_period || "yearly";
  const isFounder = session.metadata?.is_founder === "true";
  
  // GUEST CHECKOUT - Felhasználó létrehozása
  if (!userId || userId === "guest") {
    const customerId = session.customer as string;
    const customer = await stripe.customers.retrieve(customerId);
    
    if (!customer.deleted && customer.email) {
      // Új felhasználó létrehozása Supabase Auth-tal
      const tempPassword = crypto.randomUUID();
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: customer.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: customer.name || "",
        },
      });
      
      if (!authError && authData.user) {
        userId = authData.user.id;
        
        // Jelszó visszaállítási email küldése
        await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: customer.email,
        });
      }
    }
  }
  
  if (!userId || !tier) {
    console.error("Missing user_id or tier");
    break;
  }
  
  // Kredit számítás billing period alapján
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.hobby;
  let monthlyWordLimit = limits.monthlyWordLimit;
  let extraWordsBalance = 0;
  
  if (billingPeriod === "yearly" && tier !== "free") {
    // Éves: 12 hónap egyszerre az extra balance-ba
    monthlyWordLimit = 0;
    extraWordsBalance = limits.monthlyWordLimit * 12;
  }
  
  // Storybook kredit limit
  let storybookCreditLimit = 0;
  if (tier === "hobby") storybookCreditLimit = 1;
  if (tier === "writer") storybookCreditLimit = 5;
  if (tier === "pro") storybookCreditLimit = 999;
  
  // Profil frissítése/létrehozása
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .upsert({
      user_id: userId,
      subscription_tier: tier,
      subscription_status: "active",
      billing_period: billingPeriod,
      is_founder: isFounder,
      founder_discount_applied: isFounder,
      subscription_start_date: new Date().toISOString(),
      subscription_end_date: subscriptionEndDate.toISOString(),
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      project_limit: limits.projectLimit,
      monthly_word_limit: monthlyWordLimit,
      extra_words_balance: extraWordsBalance,
      storybook_credit_limit: storybookCreditLimit,
      storybook_credits_used: 0,
      last_credit_reset: new Date().toISOString(),
    }, { onConflict: "user_id" });
  
  logStep("Subscription activated", { userId, tier, billingPeriod, monthlyWordLimit, extraWordsBalance });
  break;
}
```

**Fájl**: `supabase/functions/stripe-webhook/index.ts`

---

### 5. TIER_LIMITS konfiguráció frissítés

Az új korlátozások a memória szerint:

```typescript
const TIER_LIMITS: Record<string, { projectLimit: number; monthlyWordLimit: number }> = {
  hobby: { projectLimit: 5, monthlyWordLimit: 100000 },
  writer: { projectLimit: 50, monthlyWordLimit: 250000 },  // Javítva: 250k (nem 1M)
  pro: { projectLimit: -1, monthlyWordLimit: -1 },
};
```

---

## Összefoglaló

| Fájl | Módosítás |
|------|-----------|
| `src/components/pricing/PricingSection.tsx` | billingPeriod átadása |
| `src/hooks/useCheckout.ts` | billingPeriod paraméter hozzáadása |
| `supabase/functions/create-checkout/index.ts` | billing_period metadata |
| `supabase/functions/stripe-webhook/index.ts` | Guest user létrehozás + kredit logika |

---

## Folyamat Után

```text
1. User kattint "REGISZTRÁLOK" gombra
     ↓
2. Stripe Checkout megnyílik (email, kártya, cím, telefon)
     ↓
3. Sikeres fizetés
     ↓
4. Stripe webhook triggerelődik
     ↓
5. Ha guest: új Supabase user létrejön
     ↓
6. Profil aktiválódik a megfelelő csomaggal
     - Éves: 12 hó kredit egyszerre
     - Havi: havi limit beállítva
     ↓
7. User kap egy jelszó-beállító emailt
     ↓
8. Átirányítás a dashboard-ra
```

