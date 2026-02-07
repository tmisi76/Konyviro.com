
# Terv: Referral rendszer UI frissítések

## Összefoglaló

A következő változtatásokat kell végrehajtani:

1. **40px padding a kilépés gomb fölé** - DashboardSidebar-ban
2. **"Ajánld egy barátodnak" szöveg a kredit kiírás alá** - UsagePanel compact módban
3. **Referral promóciós doboz a "Folyamatban lévő írások" fölé** - Dashboard főoldalon
4. **Figyelmeztetés a csalásokról** - ReferralCard komponensben modal vagy kiterjesztett figyelmeztetés

---

## 1. DashboardSidebar - Kilépés gomb padding

**Fájl:** `src/components/dashboard/DashboardSidebar.tsx`

A separator és a kilépés gomb közé 40px padding hozzáadása:

```text
Jelenlegi struktúra:
  - Beállítások gomb
  - Separator (my-2)
  - Kilépés gomb

Új struktúra:
  - Beállítások gomb
  - Separator (my-2)
  - 40px padding (pt-10)
  - Kilépés gomb
```

**Változtatás:** A separator `my-2` marad, de a kilépés gombon `mt-10` (40px) padding lesz.

---

## 2. UsagePanel - Referral szöveg a kredit alá

**Fájl:** `src/components/dashboard/UsagePanel.tsx`

A compact módban az Extra kredit és Hangoskönyv kredit után egy új sor:

```text
┌─────────────────────────────────────────────┐
│ ⚡ AI szavak                          75%  │
│ [=============================        ]     │
│ 📁 Projektek                         2/3   │
│ [====================                 ]     │
│ 🪙 Extra                         10,000    │
│ 🎧 Hangoskönyv                   30 perc   │
│                                             │
│ 🎁 Ajánld egy barátodnak!              →   │
│    +10.000 szó kredit                       │
└─────────────────────────────────────────────┘
```

Ez kattintható link lesz, ami modal-t nyit meg a ReferralCard tartalmával.

---

## 3. Dashboard - Promóciós doboz a főoldalon

**Fájl:** `src/pages/Dashboard.tsx`

Új komponens a Stats cards és "Folyamatban lévő írások" szekció közé:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🎁 Ajánld a Könyvírót barátaidnak!                                  │
│                                                                     │
│ Oszd meg a meghívó linkedet és mindketten kaptok 10.000 szó         │
│ kreditet!                                          [ Megosztás ]    │
└─────────────────────────────────────────────────────────────────────┘
```

Kattintásra/gombra modal nyílik meg a teljes ReferralCard tartalommal.

---

## 4. ReferralCard - Csalás figyelmeztetés

**Fájl:** `src/components/settings/ReferralCard.tsx`

Új figyelmeztetés blokk az Info szekció után:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ Fontos figyelmeztetés                                            │
│                                                                     │
│ A rendszer visszaéléseit (pl. email alias-ok használata,            │
│ ugyanazon IP címről több regisztráció) folyamatosan                │
│ monitorozzuk. Visszaélés esetén az érintett fiókok azonnali,       │
│ örökös tiltással járnak. Kérjük, ne trükközz!                      │
└─────────────────────────────────────────────────────────────────────┘
```

Piros/narancssárga színű AlertTriangle ikonnal és figyelmeztető stílussal.

---

## 5. Új komponens: ReferralBanner

**Fájl:** `src/components/dashboard/ReferralBanner.tsx`

Promóciós banner komponens a Dashboard-ra:

| Tulajdonság | Érték |
|-------------|-------|
| Stílus | Gradient háttér (primary/5 → transparent) |
| Ikon | Gift icon |
| Cím | "Ajánld a Könyvírót!" |
| Alcím | "10.000 szó kredit mindkettőtöknek" |
| Gomb | "Megosztás" → modal nyitás |

---

## 6. Új komponens: ReferralModal

**Fájl:** `src/components/settings/ReferralModal.tsx`

A ReferralCard tartalmát Dialog-ba csomagoljuk, amit több helyről meg lehet nyitni:
- Dashboard ReferralBanner
- UsagePanel "Ajánld egy barátodnak" link

---

## Érintett fájlok

| Fájl | Művelet |
|------|---------|
| `src/components/dashboard/DashboardSidebar.tsx` | Módosítás (40px padding) |
| `src/components/dashboard/UsagePanel.tsx` | Módosítás (referral link) |
| `src/pages/Dashboard.tsx` | Módosítás (ReferralBanner hozzáadás) |
| `src/components/settings/ReferralCard.tsx` | Módosítás (figyelmeztetés) |
| `src/components/dashboard/ReferralBanner.tsx` | Új fájl |
| `src/components/settings/ReferralModal.tsx` | Új fájl |

---

## Implementációs sorrend

1. `ReferralModal.tsx` - Új modal komponens a ReferralCard tartalmával + figyelmeztetés
2. `ReferralCard.tsx` - Figyelmeztetés hozzáadása
3. `ReferralBanner.tsx` - Új banner komponens
4. `Dashboard.tsx` - Banner integrálása desktop és mobil nézetben
5. `UsagePanel.tsx` - Referral link compact módban
6. `DashboardSidebar.tsx` - 40px padding a kilépés gomb fölé
