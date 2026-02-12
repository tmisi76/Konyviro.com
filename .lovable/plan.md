
# Jelszóváltoztatás az Admin Beállításokban

## Összefoglaló

A már meglévő `ChangePasswordSection` komponens importálása és elhelyezése az `AdminSettings` oldalon, a meglévő kártyák mellett.

## Megvalósítás

### Módosítandó fájl

| Fájl | Változás |
|------|---------|
| `src/pages/admin/AdminSettings.tsx` | `ChangePasswordSection` komponens importálása és beillesztése a kártyák grid-je alá |

### Részletek

- A `ChangePasswordSection` komponens már tartalmazza a teljes jelszócsere logikát (jelenlegi jelszó ellenőrzés, új jelszó validáció, show/hide gombok)
- Egyszerűen importáljuk és a 2x2-es kártya rács után, egy külön szekcióként helyezzük el
- Nem kell új komponenst vagy logikát írni, csak újrafelhasználjuk a meglévőt
