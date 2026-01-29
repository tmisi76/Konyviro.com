

# Javítás: Lektorálás Stripe Árazás

## Probléma

A `create-proofreading-purchase` Edge Function 119. sorában hibás a logika:

```typescript
unit_amount: finalPrice, // HUF doesn't use subunits  ← HIBÁS komment és kód!
```

A HUF valóban **használ** alegységeket (fillér), tehát a Stripe API-nak fillérben kell megkapnia az összeget.

| Szószám | Helyes ár | Jelenleg beállított |
|---------|-----------|---------------------|
| 50 000 szó | 5 000 Ft | 50 Ft |
| 100 000 szó | 10 000 Ft | 100 Ft |

## Megoldás

A `unit_amount` értékét meg kell szorozni 100-zal:

```typescript
// Jelenlegi (HIBÁS):
unit_amount: finalPrice, // HUF doesn't use subunits

// Javított (HELYES):
unit_amount: finalPrice * 100, // HUF uses fillér (100 fillér = 1 Ft)
```

## Érintett Fájl

| Fájl | Változás |
|------|----------|
| `supabase/functions/create-proofreading-purchase/index.ts` | 119. sor: `unit_amount: finalPrice * 100` |

## Technikai Részletek

A Stripe API-nál a HUF valuta esetén:
- `unit_amount: 100` = 1 Ft
- `unit_amount: 199000` = 1 990 Ft (minimum ár)
- `unit_amount: 500000` = 5 000 Ft (50k szó)

## Implementáció

1. Módosítás a 119. sorban
2. Edge Function újratelepítése

