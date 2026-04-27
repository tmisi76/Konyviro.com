---
name: pricing-tiers-v2-agency
description: 2026 Q2 áremelés: HOBBI 9990/59990 Ft, PROFI 19990/119990 Ft, új ÜGYNÖKSÉG csomag (59990/359990 Ft, 5x PROFI limit). INGYENES rejtett. Régi előfizetők grandfatherezve.
type: feature
---
**Új csomagok és árak** (érvényes új feliratkozóknak):

| Tier | id | Havi | Éves | Projekt | Szó/hó | Mese/hó |
|---|---|---|---|---|---|---|
| HOBBI | hobby | 9.990 Ft | 59.990 Ft | 5 | 100.000 | 1 |
| PROFI | writer | 19.990 Ft | 119.990 Ft | 50 | 250.000 | 5 |
| ÜGYNÖKSÉG | agency | 59.990 Ft | 359.990 Ft | 250 | 1.250.000 | 25 |
| PRO (rejtett) | pro | 29.990 Ft | 179.940 Ft | unlimited | unlimited | 999 |

**INGYENES tier:** `isHidden: true` — nem jelenik meg a publikus pricing oldalon és modalban.

**Új Stripe price_id-k (új feliratkozók):**
- HOBBI: havi `price_1TQmGVBqXALGTPIrPvPRE6KC`, éves `price_1TQmGWBqXALGTPIr7S5g9RPw`
- PROFI: havi `price_1TQmGXBqXALGTPIrhCjEFaXk`, éves `price_1TQmGYBqXALGTPIrYIHATtgi`
- ÜGYNÖKSÉG: havi `price_1TQmGaBqXALGTPIrc79f9jvx`, éves `price_1TQmGcBqXALGTPIrdfmuEjxH`

**Régi (grandfather) Stripe price_id-k (meglévő előfizetők, NEM töröltük):**
- HOBBI havi `price_1Ss8bGBqXALGTPIrOVHTHBPA` (4.990), éves `price_1Ss3QZBqXALGTPIr0z2uRD0a` (29.940)
- PROFI havi `price_1Ss8bHBqXALGTPIrEmUEe1Gw` (14.990), éves `price_1Ss3QbBqXALGTPIrjbB9lSCI` (89.940)

A meglévő előfizetők változatlan áron futnak Stripe-ban; csak az új checkout sessionök használják az új price_id-kat. Új csomagváltáskor a `PlanComparisonModal` az új price_id-kat hívja → áremelés érvényesül.

**Érintett fájlok:** `src/types/subscription.ts`, `src/components/pricing/PricingSection.tsx`, `src/components/settings/PlanComparisonModal.tsx`, `src/hooks/useStripeSubscription.ts`, `src/pages/admin/AdminAISettings.tsx`, `src/hooks/admin/useAdminStats.ts`, `src/hooks/admin/useAdminSubscriptions.ts`, `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/check-retention-eligibility/index.ts`.

**SubscriptionTier típus:** `"free" | "hobby" | "writer" | "agency" | "pro"` (új: `agency`).
