
# Terv: Előfizetési Csomagok Frissítése

## Összefoglaló
Frissíteni kell az előfizetési csomagokat a nyitóoldalon és az adatbázisban az új limitekkel és funkciókkal.

## Változások Összehasonlítása

| Csomag | Régi Projekt Limit | Új Projekt Limit | Régi Szó Limit | Új Szó Limit |
|--------|-------------------|-----------------|----------------|--------------|
| **Ingyenes** | 1 | 1 | 1,000 | 1,000 |
| **Hobbi** | 1 | **5** | 100,000 | 100,000 |
| **Író** | 5 | **50** | 1,000,000 | 1,000,000 |

## Új Feature Listák

### Ingyenes
- 1 aktív projekt
- 1.000 szó / hó AI generálás
- ❌ NINCS exportálási lehetőség
- ❌ NINCS Könyvborító tervező
- ❌ NINCS Kreatív regényíró
- ❌ NINCS Támogatás

### Hobbi
- 5 aktív projekt
- 100.000 szó / hó AI generálás
- ✅ Exportálás (DOC, Epub, PDF, TXT)
- ✅ Nano Banana Könyvborító tervező
- ✅ Kreatív regényíró AI rendszer
- ✅ Email támogatás

### Író
- 50 aktív projekt
- 1.000.000 szó / hó AI generálás
- ✅ Exportálás (DOC, Epub, PDF, TXT)
- ✅ Nano Banana Könyvborító tervező
- ✅ Kreatív regényíró AI rendszer
- ✅ Karakter & kutatás modul
- ✅ Minden műfaj (+18 tartalom)
- ✅ Email támogatás

## Érintett Fájlok

| Fájl | Változás Típusa |
|------|----------------|
| `src/types/subscription.ts` | Új feature listák és projekt limitek |
| `supabase/functions/stripe-webhook/index.ts` | TIER_LIMITS frissítése |
| `supabase/functions/admin-update-subscription/index.ts` | TIER_CONFIG frissítése |

## Részletes Változások

### 1. src/types/subscription.ts

**Ingyenes csomag (free):**
```typescript
features: [
  "1 aktív projekt",
  "1.000 szó / hó AI generálás",
  "❌ Nincs exportálás",
  "❌ Nincs borító tervező",
  "❌ Nincs támogatás",
],
projectLimit: 1,
monthlyWordLimit: 1000,
```

**Hobbi csomag:**
```typescript
features: [
  "5 aktív projekt",
  "100.000 szó / hó AI generálás",
  "Exportálás (DOC, Epub, PDF, TXT)",
  "Nano Banana Könyvborító tervező",
  "Kreatív regényíró AI rendszer",
  "Email támogatás",
],
projectLimit: 5,  // Változás: 1 → 5
monthlyWordLimit: 100000,
```

**Író csomag:**
```typescript
features: [
  "50 aktív projekt",
  "1.000.000 szó / hó AI generálás",
  "Exportálás (DOC, Epub, PDF, TXT)",
  "Nano Banana Könyvborító tervező",
  "Kreatív regényíró AI rendszer",
  "Karakter & kutatás modul",
  "Minden műfaj (+18 tartalom)",
  "Email támogatás",
],
projectLimit: 50,  // Változás: 5 → 50
monthlyWordLimit: 1000000,
```

### 2. supabase/functions/stripe-webhook/index.ts

A `TIER_LIMITS` konstans frissítése:
```typescript
const TIER_LIMITS: Record<string, { projectLimit: number; monthlyWordLimit: number }> = {
  hobby: { projectLimit: 5, monthlyWordLimit: 100000 },    // 1→5, 50000→100000
  writer: { projectLimit: 50, monthlyWordLimit: 1000000 }, // 5→50, 200000→1000000
  pro: { projectLimit: -1, monthlyWordLimit: -1 },
};
```

### 3. supabase/functions/admin-update-subscription/index.ts

A `TIER_CONFIG` konstans frissítése:
```typescript
const TIER_CONFIG: Record<string, { wordLimit: number; projectLimit: number }> = {
  free: { wordLimit: 1000, projectLimit: 1 },
  hobby: { wordLimit: 100000, projectLimit: 5 },     // 50000→100000, 1→5
  writer: { wordLimit: 1000000, projectLimit: 50 },  // 200000→1000000, 5→50
  pro: { wordLimit: 999999999, projectLimit: 999 },
};
```

### 4. Adatbázis Frissítése (subscription_plans tábla)

SQL UPDATE parancsok a `subscription_plans` táblához:
```sql
-- Ingyenes csomag frissítése
UPDATE subscription_plans 
SET 
  features = '["1 aktív projekt", "1.000 szó / hó AI generálás", "❌ Nincs exportálás", "❌ Nincs borító tervező", "❌ Nincs támogatás"]'::jsonb,
  limits = '{"max_projects": 1, "monthly_word_limit": 1000}'::jsonb
WHERE slug = 'free';

-- Hobbi csomag frissítése
UPDATE subscription_plans 
SET 
  features = '["5 aktív projekt", "100.000 szó / hó AI generálás", "Exportálás (DOC, Epub, PDF, TXT)", "Nano Banana Könyvborító tervező", "Kreatív regényíró AI rendszer", "Email támogatás"]'::jsonb,
  limits = '{"max_projects": 5, "monthly_word_limit": 100000}'::jsonb
WHERE slug = 'hobby';

-- Író csomag frissítése
UPDATE subscription_plans 
SET 
  features = '["50 aktív projekt", "1.000.000 szó / hó AI generálás", "Exportálás (DOC, Epub, PDF, TXT)", "Nano Banana Könyvborító tervező", "Kreatív regényíró AI rendszer", "Karakter & kutatás modul", "Minden műfaj (+18 tartalom)", "Email támogatás"]'::jsonb,
  limits = '{"max_projects": 50, "monthly_word_limit": 1000000}'::jsonb
WHERE slug = 'writer';
```

## Vizuális Előnézet

A PricingSection így fog kinézni:

```text
┌─────────────────────┬─────────────────────┬─────────────────────┐
│     INGYENES        │       HOBBI         │        ÍRÓ          │
│       0 Ft          │    4.990 Ft/hó      │    14.990 Ft/hó     │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ ● 1 aktív projekt   │ ● 5 aktív projekt   │ ● 50 aktív projekt  │
│ ● 1.000 szó/hó      │ ● 100.000 szó/hó    │ ● 1.000.000 szó/hó  │
│ ❌ Nincs export     │ ● Export (DOC,...)  │ ● Export (DOC,...)  │
│ ❌ Nincs borító     │ ● Borító tervező    │ ● Borító tervező    │
│ ❌ Nincs támogatás  │ ● Email támogatás   │ ● Karakter modul    │
│                     │                     │ ● +18 tartalom      │
│                     │                     │ ● Email támogatás   │
├─────────────────────┼─────────────────────┼─────────────────────┤
│   [Regisztrálok]    │    [Lefoglalom]     │    [Lefoglalom]     │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

## Implementáció Lépései

1. **Frontend típusok frissítése** - `src/types/subscription.ts` módosítása
2. **Edge Functions frissítése** - `stripe-webhook` és `admin-update-subscription` 
3. **Adatbázis frissítése** - SQL INSERT tool használata a `subscription_plans` tábla frissítéséhez
4. **Edge Functions újratelepítése** - Deploy a frissített funkciókhoz

## Megjegyzés
A meglévő felhasználók limitjei NEM változnak automatikusan - az ő `profiles` táblában tárolt értékei megmaradnak. Csak az új előfizetésekre vonatkoznak az új limitek.
