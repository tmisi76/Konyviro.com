# CTA szövegek és viselkedés egységesítése

## Mit változtatunk

### 1. Landing oldali "ingyenes" CTA gombok szövegcseréje
A "Ingyenesen kipróbálom" / "Ingyenes próba" / "Próbáld ki ingyen" szövegek lecserélése egységesen a hosszabb, 7 napos verzióra:

- **HeroSection.tsx**: `"Ingyenesen kipróbálom"` → `"Ingyenesen kipróbálom hét napig"`
- **Navbar.tsx** (desktop + mobil): `"Ingyenes próba"` → `"Ingyenes próba hét napra"`
- **CollaborationSection.tsx**: `"Próbáld ki ingyen"` → `"Ingyenesen kipróbálom hét napig"`
- **Footer.tsx**: ha van hasonló CTA, ugyanígy frissítve

### 2. Viselkedés: scroll a #pricing szekcióhoz, ne navigáció /pricing-re
Jelenleg ezek a gombok `navigate("/pricing")`-et hívnak. Átállítjuk őket úgy, hogy:

- Ha a felhasználó a **főoldalon (`/`)** van → smooth scroll a `#pricing` szekcióhoz (a `PricingSection`-nek már van `id="pricing"`).
- Ha **másik oldalon** van (pl. /pricing már magán a pricing oldalon nem releváns, de Navbar mindenhol látszik) → `navigate("/#pricing")`, ami betölti a főoldalt és odagörget.

Egy közös helper logika a komponensekben (kis inline függvény):
```ts
const goToPricing = () => {
  if (location.pathname === "/") {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  } else {
    navigate("/#pricing");
  }
};
```
Plusz az `Index.tsx`-ben (vagy App szinten) egy kis effekt, ami betöltéskor `location.hash === "#pricing"` esetén legörget.

### 3. Pricing kártya CTA szövege
A `PricingSection.tsx`-ben a `PricingCard` `ctaText` prop:
- Jelenleg: `"REGISZTRÁLOK"` (a korábbi körben már `"Hét napig ingyenesen kipróbálom"`-ra lett állítva, ellenőrizzük és tartjuk: **`"Hét napig ingyenesen kipróbálom"`**).

## Érintett fájlok
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/Navbar.tsx`
- `src/components/landing/CollaborationSection.tsx`
- `src/components/landing/Footer.tsx` (csak ha van releváns CTA)
- `src/components/pricing/PricingSection.tsx` (ctaText megerősítés)
- `src/pages/Index.tsx` (hash-scroll támogatás betöltéskor)

## Amit NEM változtatunk
- A `/pricing` oldal és a routing megmarad.
- A "Bejelentkezés" gombok és más, nem-ingyenes CTA-k változatlanok.
- A pricing kártyák Stripe checkout flow-ja változatlan.
