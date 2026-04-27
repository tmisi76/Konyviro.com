## Cél

Áremelés és új ÜGYNÖKSÉG csomag bevezetése. Az INGYENES csomag eltüntetése a publikus oldalakról. Meglévő előfizetők ára nem változik (Stripe automatikusan grandfatherezi a régi `price_id`-kat — csak az új feliratkozók kapják az új árakat, mert új `price_id`-okat hozunk létre).

## Új árak

| Csomag | Havi | Éves | Projekt | AI szó/hó | Mesekönyv/hó |
|---|---|---|---|---|---|
| HOBBI | 9.990 Ft | 59.990 Ft | 5 | 100.000 | 1 |
| PROFI | 19.990 Ft | 119.990 Ft | 50 | 250.000 | 5 |
| **ÜGYNÖKSÉG (új)** | 59.990 Ft | 359.990 Ft | **250** | **1.250.000** | **25** |

ÜGYNÖKSÉG = 5× a PROFI limitjei.

## Lépések

### 1. Új Stripe árak létrehozása
Új `price_id`-okat hozok létre Stripe-ban (a meglévő termékekhez új price-okat, illetve egy új ÜGYNÖKSÉG terméket):
- HOBBI havi 9.990 Ft, HOBBI éves 59.990 Ft (új price-ok meglévő termékhez)
- PROFI havi 19.990 Ft, PROFI éves 119.990 Ft (új price-ok meglévő termékhez)
- ÜGYNÖKSÉG új termék + havi 59.990 Ft + éves 359.990 Ft price-ok

A régi `price_id`-okat **nem töröljük** — a meglévő előfizetők változatlan áron futnak tovább.

### 2. `src/types/subscription.ts`
- INGYENES csomag → `isHidden: true` (vagy eltávolítás a publikus listáról)
- HOBBI: új árak + új `monthlyPriceId` / `yearlyPriceId`
- PROFI (writer): új árak + új price ID-k
- Új `agency` tier hozzáadása: `id: "agency"`, név: "ÜGYNÖKSÉG", limitek 5× PROFI
- `SubscriptionTier` típus bővítése: `"agency"` hozzáadása
- Az "Alapító -50%" badge logikát eltávolítjuk a pricing oldalról (mert az új árak már a teljes árak)

### 3. `supabase/functions/stripe-webhook/index.ts`
- `TIER_LIMITS` bővítése `agency: { projectLimit: 250, monthlyWordLimit: 1250000, storybookLimit: 25 }`
- `tierNames` és `tierPricesAdmin` bővítése az ÜGYNÖKSÉG-gel és új árakkal

### 4. `src/components/settings/PlanComparisonModal.tsx`
- `PRICE_IDS` frissítése új ID-kkal + `agency` hozzáadása
- `TIER_ORDER` bővítése `"agency"`-vel
- Típuscast-ek `"hobby" | "writer" | "pro" | "agency"`

### 5. `src/hooks/useCheckout.ts` és `src/components/pricing/PricingSection.tsx`
- Tier típusok kiegészítése `"agency"`-vel
- Pricing oldal rácsa 4 oszlopra (lg:grid-cols-4) hogy a 3 fizetős csomag elférjen (ingyenes nélkül 3 csomag → `lg:grid-cols-3`)
- INGYENES kártya nem jelenik meg

### 6. Pricing card visual
- ÜGYNÖKSÉG kártya distinctive színt kap (pl. arany/secondary), megjelölve "Csapatoknak / Ügynökségeknek"
- A "Legnépszerűbb" badge marad PROFI-n

### 7. Magyar formázás
A HOBBI havi 9.990 Ft, éves 59.990 Ft → `monthlyEquivalent` az éves árhoz: "(havi 4.999 Ft)" stb.

## Mit NEM csinálunk
- Nem migráljuk a meglévő előfizetőket — ők maradnak a régi price-on (Stripe ezt automatikusan kezeli)
- Nem töröljük a régi Stripe price-okat
- Az adatbázisban a `subscription_tier` enumot nem korlátozza CHECK constraint, így nem kell migráció — `"agency"` szöveg simán beíródik

## Megerősítendő
- Az ÜGYNÖKSÉG csomag features listája (a PROFI-éhoz képest mit emeljünk ki külön: pl. "Csapat együttműködés", "Prioritás támogatás", "Több párhuzamos generálás"?)
- Ha jó a default: 5× projekt + 5× szó + 5× mesekönyv + minden PROFI feature + "Ügynökségi prioritás támogatás" + "Csapat hozzáférés (collaboration)"