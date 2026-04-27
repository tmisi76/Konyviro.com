# Nyitóoldali CTA-k és csomag gomb átírása

## Cél
1. A landing page minden "ingyenes próba" / "ingyenesen kipróbálom" / "regisztráció" típusú gombja a `/pricing` oldalra navigáljon (és ne a `/auth?mode=register` route-ra).
2. A `/pricing` oldal csomagkártyáin a CTA gomb felirata legyen: **"Hét napig ingyenesen kipróbálom"** (a jelenlegi "REGISZTRÁLOK" helyett).

## Érintett fájlok és változtatások

### 1. `src/components/landing/HeroSection.tsx`
- "Ingyenesen kipróbálom" gomb: `navigate("/auth?mode=register")` → `navigate("/pricing")`

### 2. `src/components/landing/Navbar.tsx`
- Desktop "Ingyenes próba" gomb (78. sor): `/auth?mode=register` → `/pricing`
- Mobil "Ingyenes próba" gomb (143. sor): `/auth?mode=register` → `/pricing`
- A "Bejelentkezés" gomb marad `/auth`-on.

### 3. `src/components/landing/Footer.tsx`
- "Ingyenes próba" link `to="/auth"` → `to="/pricing"`

### 4. `src/components/landing/CollaborationSection.tsx`
- "Próbáld ki ingyen" gomb: `/auth?mode=register` → `/pricing`
- A második gomb (`/pricing`) marad.

### 5. `src/components/pricing/PricingSection.tsx`
- A `<PricingCard>` `ctaText` propja: `"REGISZTRÁLOK"` → `"Hét napig ingyenesen kipróbálom"`

## Megjegyzés
- A `/pricing` oldalon a csomag kiválasztásakor a meglévő logika továbbra is Stripe checkoutot indít (vendég/auth flow), ami a 7 napos próbát kezeli a háttérben — ezzel külön nem kell foglalkozni ebben a körben.
- Az AuthPage és más belső linkek (pl. már bejelentkezett user dashboard) változatlanok.
