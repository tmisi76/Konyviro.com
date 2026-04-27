## Cél

A `/` nyitóoldal frissítése úgy, hogy a ma elkészült új képességek (Csapat / kollaboráció, AI Folytatás, Fejezet Recap, Plot Twist, Karakter Hálózat, Konzisztencia-audit / Inbox, Kulturális névadás) is megjelenjenek és eladhatóvá váljanak.

## Mit változtatunk

### 1. `FeaturesSection.tsx` — bővített funkciórács
A jelenlegi 6 általános kártya helyett **9 kártya** 3×3 elrendezésben, hogy a friss képességek is helyet kapjanak. Új / frissített kártyák:

- **Csapat & Kollaboráció** (ikon: `Users2`) — „Hívd meg a társszerződ vagy szerkesztőd. Megosztott projektek, szerepkörök (szerkesztő / olvasó), és valós idejű együttműködés."
- **AI Folytatás 1 kattintással** (ikon: `Wand2`) — „Soha ne akadj el. Az AI a stílusodban folytatja a mondatot, bekezdést vagy jelenetet."
- **Konzisztencia Őr** (ikon: `ShieldCheck`) — „Automatikus audit: karakternév-ellentmondások, kulturális hibák, helyszín-eltérések felismerése és javítási javaslatok."
- **Karakter Hálózat** (ikon: `Network` / `Share2`) — „Vizuális gráf a karaktereid kapcsolatairól — egy pillantás alatt átlátod a szereplőhálót."
- **Plot Twist Generátor** (ikon: `Zap`) — „Megakadtál? Az AI 3 logikus, mégis meglepő fordulatot javasol a vázlatod alapján."
- **Fejezet Recap** (ikon: `BookmarkCheck`) — „Visszatérve azonnal képben vagy: 3-4 mondatos AI összefoglaló + folytatási irányok."

A meglévő kártyákból megtartjuk: **Könyv Coach**, **Karakter Menedzsment**, **Export Formátumok**. (A „Kutatás Modul" és „Fejezet Szervezés" kikerül a 9 kártyás keretbe való illesztés miatt — rövid funkciórács, kevesebb redundancia.)

### 2. Új szekció: **Csapatban dolgozz** (`CollaborationSection.tsx`)
Dedikált szekció a `HowItWorksSection` után, két oszlopban:
- Bal: cím + leírás + 3 bullet (Meghívás emailen / Szerepkörök / Megosztott karakterek és vázlat) + CTA „Próbáld ki ingyen".
- Jobb: vizuális mockup card — több színes avatar + projekt cím + „3 társszerző aktív" badge.

### 3. Új szekció: **Profi minőség, automatikusan** (`QualityShowcaseSection.tsx`)
A Pricing előtt, sötét háttérrel kiemelve. Bemutatja a minőség-vezérelt motort:
- 3 kis kártya: **Konzisztencia-audit**, **Auto-lektor**, **Kulturális névadás** (pl. „Magyar regényhez magyar nevek — Japán helyszínhez japán nevek, automatikusan").
- Mini „előtte/utána" példa: nyers AI mondat → lektorált verzió.

### 4. `Navbar.tsx` — új menüpont
Új link: **„Csapat"** ami a `#collaboration` szekcióra ugrik (desktop + mobile menüben is). Sorrend: Funkciók · Hogyan működik · Csapat · Árazás · GYIK.

### 5. `Index.tsx` — szekciók beillesztése
Új sorrend:
```text
Navbar
HeroSection
FeaturesSection             (9 kártya, frissítve)
HowItWorksSection
CollaborationSection        (ÚJ – id="collaboration")
QualityShowcaseSection      (ÚJ)
PricingSection
FAQSection
Footer
```

### 6. FAQ frissítés (opcionális, kis bővítés)
2 új kérdés a `FAQSection`-be: „Lehet csapatban dolgozni?" és „Hogyan biztosítjátok, hogy a karakternevek illeszkedjenek a választott országhoz?"

## Stílus / dizájn

- A meglévő design tokeneket használjuk (`bg-card`, `text-primary`, `text-secondary`, `text-accent`, `text-success`, `text-warning`, `text-info`).
- Kártyák ugyanolyan `rounded-2xl border bg-card hover:-translate-y-1` interakcióval, mint a jelenlegi `FeaturesSection`.
- Konzisztens `py-20 sm:py-28` szekció-paddingek és `container mx-auto`.
- Csak Lucide ikonok (`Users2`, `Wand2`, `ShieldCheck`, `Network`, `Zap`, `BookmarkCheck`).

## Érintett fájlok

- `src/pages/Index.tsx` (szerkesztés)
- `src/components/landing/Navbar.tsx` (szerkesztés — új menüpont)
- `src/components/landing/FeaturesSection.tsx` (szerkesztés — 9 kártya)
- `src/components/landing/FAQSection.tsx` (szerkesztés — 2 új kérdés)
- `src/components/landing/CollaborationSection.tsx` (új)
- `src/components/landing/QualityShowcaseSection.tsx` (új)

Nincs adatbázis-, edge function- vagy auth-változás — kizárólag a marketing felület frissítése.
