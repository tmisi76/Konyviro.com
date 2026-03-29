

# Megosztás funkció hozzáadása a ProjectCard "..." menüjébe + PDF-olvasó-szerű reader oldal

## Összefoglaló

A ProjectCard dropdown menüjébe kerül egy "Megosztás" menüpont, ami megnyitja a már létező `ShareBookModal`-t. A `PublicBookReader` oldalt átalakítjuk egy szép, PDF-reader-szerű ebook olvasóvá, promo sávval a `konyviro.com`-ra.

## Változtatások

### 1. ProjectCard — Megosztás menüpont hozzáadása
**Fájl:** `src/components/dashboard/ProjectCard.tsx`
- Import: `Share2` ikon + `ShareBookModal`
- Új state: `showShareModal`
- Új `DropdownMenuItem` az "Exportálás" után: `<Share2 /> Megosztás`
- `ShareBookModal` renderelése a komponens aljára

### 2. PublicBookReader — PDF-reader-szerű újratervezés + promo
**Fájl:** `src/pages/PublicBookReader.tsx`
- A jelenlegi layout helyett: **kétoszlopos** (desktop) / **egyoszlopos + alul promo** (mobil)
- **Bal oldal (fő tartalom):** PDF-reader-szerű megjelenés:
  - Sötétebb háttér (muted), fehér "papír" középen árnyékkal
  - Fejezet tartalom serif betűtípussal, sorkizárt
  - Oldalszámozás alul
  - Fejezet navigáció oldalsávban (megtartjuk a `BookScrollView`-t, de csinosítjuk)
- **Jobb oldal (promo sáv, ~280px):** Sticky sáv:
  - KönyvÍró logó/név
  - "Írd meg te is a saját könyved!" szöveg
  - CTA gomb → `https://konyviro.com/`
  - Esetleg: "Powered by KönyvÍró" footer

### 3. Technikai részletek

| Fájl | Változás |
|------|----------|
| `src/components/dashboard/ProjectCard.tsx` | +`ShareBookModal` import, +`showShareModal` state, +menüpont, +modal renderelés |
| `src/pages/PublicBookReader.tsx` | Layout átalakítás: PDF-reader stílus + jobb oldali promo sáv `konyviro.com` linkkel |

Nincs adatbázis migráció — a megosztás infrastruktúra (edge functions, `book_shares` tábla, RLS) már teljes egészében létezik.

