

# Terv: Referral Gomb Feltűnőbbé Tétele

## Probléma

A jelenlegi referral link a compact sidebar-ban nagyon gyenge:
- Kis méretű szöveg (`text-xs`)
- Csak szöveg, nincs vizuális kiemelés
- Nem vonzza a figyelmet

## Megoldás

Átalakítom egy nagy, színes, gradient hátterű gombra:

```text
Jelenlegi:
┌─────────────────────────────────────┐
│ 🎁 Ajánld egy barátodnak!  +10k szó │  ← apró szöveg
└─────────────────────────────────────┘

Új dizájn:
┌─────────────────────────────────────┐
│  🎁  HÍVD MEG BARÁTAIDAT!           │  ← nagy, feltűnő gomb
│      +10.000 szó kredit             │     gradient háttér
└─────────────────────────────────────┘
```

## Stílus Részletek

| Tulajdonság | Érték |
|-------------|-------|
| Háttér | Gradient: `primary` → `primary/80` |
| Szövegszín | Fehér (`text-white`) |
| Méret | Teljes szélesség, nagyobb padding |
| Ikon | Gift ikon fehér színben |
| Animáció | Hover: skála növelés + árnyék |
| Border radius | Kerekített sarkok (`rounded-lg`) |

## Kód Változtatás

**Fájl:** `src/components/dashboard/UsagePanel.tsx`

A 190-202. sorok cseréje:

```tsx
{/* Referral CTA button - feltűnő */}
<button 
  onClick={() => setShowReferralModal(true)}
  className="w-full mt-3 p-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 
             text-white font-medium text-sm
             hover:shadow-lg hover:scale-[1.02] transition-all duration-200
             flex flex-col items-center gap-1"
>
  <span className="flex items-center gap-2">
    <Gift className="h-4 w-4" />
    Hívd meg barátaidat!
  </span>
  <span className="text-xs opacity-90">
    +{(REFERRAL_BONUS_WORDS).toLocaleString("hu-HU")} szó kredit
  </span>
</button>
```

## Vizuális Összehasonlítás

| Aspektus | Előtte | Utána |
|----------|--------|-------|
| Betűméret | `text-xs` | `text-sm` + `text-xs` alcím |
| Háttér | Nincs | Gradient primary |
| Ikon | 3x3 | 4x4 |
| Padding | Minimális | `p-3` |
| Hover | Csak szín | Skála + árnyék animáció |
| Elrendezés | Egy sor | Két sor (cím + jutalom) |

## Érintett Fájl

| Fájl | Változtatás |
|------|-------------|
| `src/components/dashboard/UsagePanel.tsx` | 190-202. sor módosítása |

