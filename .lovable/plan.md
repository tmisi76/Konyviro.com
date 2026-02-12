

# Jelszóváltoztatás hibajavítás

## Probléma

Az ugyfél (Jaskó István) jelszót változtatott a Profil beállításokban, de:
1. Nem kapott "sikeres mentés" visszajelzést
2. Az új jelszóval nem tudott bejelentkezni

## Gyökér ok

A `signInWithPassword` hívás (jelenlegi jelszó ellenőrzéséhez) egy `onAuthStateChange` eseményt vált ki, ami versenyhelyzetet okozhat az utána következő `updateUser` hívással. Emellett nincs visszaellenőrzés, hogy az új jelszó tényleg működik-e.

## Javítás

A `ChangePasswordSection.tsx` komponens jelszócsere logikáját az alábbira módosítjuk:

1. Jelenlegi jelszó ellenőrzése (`signInWithPassword`)
2. Jelszó frissítése (`updateUser`)
3. **Visszaellenőrzés**: Újra bejelentkeztetés az **ÚJ** jelszóval (`signInWithPassword`) -- ha ez sikeres, biztosak lehetünk benne, hogy a jelszó tényleg megváltozott
4. **Feltűnőbb sikeres visszajelzés**: Zöld pipa ikon + "Jelszó sikeresen módosítva!" szöveg a toast-ban, `description` mezővel kiegészítve

## Technikai részletek

### Módosítandó fájl

| Fájl | Változás |
|------|---------|
| `src/components/settings/ChangePasswordSection.tsx` | Jelszócsere logika javítása: visszaellenőrzés hozzáadása, feltűnőbb toast |

### Új folyamat

```text
1. signInWithPassword(email, JELENLEGI jelszó) -> ellenőrzés
2. updateUser({ password: ÚJ jelszó }) -> frissítés
3. signInWithPassword(email, ÚJ jelszó) -> visszaellenőrzés
4. Ha 3. sikeres -> feltűnő siker toast + mezők ürítése
5. Ha 3. sikertelen -> figyelmeztetés: "Kérjük lépjen ki és próbáljon újra bejelentkezni"
```

### Toast javítás

- Siker esetén: `title` + `description` mező is kitöltve, pl. "Most már az új jelszóval tud bejelentkezni."
- Hiba esetén: Részletesebb hibaüzenetek minden lépéshez
