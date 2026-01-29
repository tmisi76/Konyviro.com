

# Javítás: Stripe Audiobook Kredit Árazás

## Probléma

A Stripe `unit_amount` mezője **fillérben** várja az összeget (a legkisebb pénzegységben), de a kód forintban adja át:

| Csomag | Helyes ár | Jelenleg beállított |
|--------|-----------|---------------------|
| 30 perc | 9 990 Ft | 99,90 Ft |
| 100 perc | 29 990 Ft | 299,90 Ft |
| 250 perc | 69 990 Ft | 699,90 Ft |

## Megoldás

A `unit_amount` értékét meg kell szorozni 100-zal:

```typescript
// Jelenlegi (HIBÁS):
unit_amount: selectedPackage.priceHuf,

// Javított (HELYES):
unit_amount: selectedPackage.priceHuf * 100,
```

## Érintett Fájl

| Fájl | Változás |
|------|----------|
| `supabase/functions/create-audiobook-credit-purchase/index.ts` | 84. sor: `unit_amount: selectedPackage.priceHuf * 100` |

## Technikai Részletek

A Stripe API-nál a HUF (forint) valuta esetén:
- `unit_amount: 100` = 1 Ft
- `unit_amount: 6999000` = 69 990 Ft

Tehát a javítás után:
- 30 perc csomag: `9990 * 100 = 999000` fillér = **9 990 Ft**
- 100 perc csomag: `29990 * 100 = 2999000` fillér = **29 990 Ft**
- 250 perc csomag: `69990 * 100 = 6999000` fillér = **69 990 Ft**

## Implementáció

Egyetlen sor módosítása a 84. sorban, majd az Edge Function újratelepítése.

