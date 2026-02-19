

# Hibalistaban a kuldo neve es emailje megjelenitese

## Problema

A hibalistan jelenleg nincs latható, hogy ki kuldte a hibat. A `created_by` mezoben ott van a `user_id`, de nem kerdeztuk le hozza a felhasznalo nevet/emailjet.

## Megoldas

A `support_tickets` lekerdezesehez csatlakoztatjuk a `profiles` tablat, es megjelenítjuk a kuldo nevet a tablazatban es a reszletes nezetben is.

## Technikai reszletek

### Modositando fajl: `src/pages/admin/AdminIssues.tsx`

**1. Issue interface bovitese**
- Uj mezo: `sender_name: string | null`

**2. Query bovitese (84-112. sor)**
- Az issues lekerdezes utan a `created_by` (user_id) lista alapjan egy masodik lekerdezes a `profiles` tablara (`user_id`, `display_name`, `full_name`)
- Osszerendeles: minden issue-hoz hozzarendeljuk a nevet

**3. Tablazat bovitese (294-338. sor)**
- Uj oszlop: "Kuldo" a "Cim" es "Prioritas" kozott
- A cellaban megjelenik a felhasznalo neve (vagy `user_id` elso 8 karaktere, ha nincs nev)

**4. Reszletes nezet Dialog bovitese**
- A fejlecben megjelenik a kuldo neve a datumok mellett

### Lekerdezesi logika

```text
1. support_tickets lekerdezes (meglevo)
2. user_id-k osszegyujtese (created_by mezobol)
3. profiles lekerdezes: SELECT user_id, display_name, full_name WHERE user_id IN (...)
4. Map: user_id -> display_name || full_name || "user_xxxxxxxx"
5. Minden issue-hoz hozzarendeles
```

Nem kell migracio, a `profiles` tabla es a `support_tickets.user_id` mar letezik.

