
Cél: Megoldani, hogy egy létező felhasználó (pl. szenteskep@gmail.com / “Timi”) biztosan megjelenjen az Admin → Felhasználók (/admin/users) listában, és ne “tűnjön el” lapozás/keresés/szűrés miatt.

## Amit már ellenőriztem (diagnózis)
- A backend admin felhasználó-lista funkció (admin-get-users) a szenteskep@gmail.com felhasználót visszaadja, tehát az adat megvan.
- A böngésző hálózati logok szerint az /admin/users oldalon ténylegesen jön válasz, és abban benne van a user.
- Emiatt a “nem jelenik meg” tipikusan UI állapot-kezelési gond:
  - rossz oldalra van lapozva (page > 1),
  - a keresés/szűrők változtatásakor nem ugrik vissza az 1. oldalra,
  - vagy a “találatok oldalszáma” megváltozik, de a UI a régi oldalszámon marad, ami üres listát ad.

## Valószínű ok
Az AdminUsers.tsx-ben a `page` state nincs automatikusan resetelve, amikor:
- megváltozik a keresőmező (`search`)
- megváltozik a státusz szűrő (`statusFilter`)
- megváltozik a csomag szűrő (`planFilter`)

Így ha pl. 5–7. oldalon állsz, és rákeresel “szenteskep”-re, a backend 1 oldalt talál (totalPages=1), de a UI továbbra is a 7. oldalt kéri → üres lista → “nem található”.

## Tervezett megoldás (kódmódosítások)

### 1) Oldalszám reset keresés/szűrő változásakor (fő fix)
Fájl: `src/pages/admin/AdminUsers.tsx`

- Hozzáadunk egy `useEffect`-et, ami figyeli: `search`, `statusFilter`, `planFilter`.
- Amint ezek bármelyike változik:
  - `setPage(1)` (vissza az 1. oldalra)
  - opcionálisan `setSelectedUsers([])` (kiválasztások törlése, hogy ne legyen “bulk action” tévesen)
  
Ezzel a felhasználó keresése mindig az első találati oldalról indul, és nem “üresbe fut”.

### 2) “Out of range” védelem: ha a page nagyobb, mint totalPages, automatikus korrekció
Fájl: `src/pages/admin/AdminUsers.tsx`

- Amikor megjön a `users?.totalPages`, ellenőrizzük:
  - ha `page > totalPages`, akkor `setPage(totalPages || 1)`
- Ez akkor is megvédi a listát, ha valamiért a totalPages lecsökken (pl. szűrés miatt).

### 3) Státusz-szűrés konzisztenciája (opcionális, de erősen ajánlott)
Jelenleg a `useAdminUsers` kliens-oldalon szűr státuszra úgy, hogy:
- `status = subscription_status === 'active' ? 'active' : 'inactive'`
- a “banned” státuszt nem kezeli (a UI-ban van “Tiltott” opció, de a logika nem ad vissza soha `banned`-et)

Javítási irány (2 lehetséges opció):

**Opció A (gyors és tiszta):** a backend (admin-get-users) kezelje a `status` paramétert, és a szerveren szűrjön (active/inactive/banned), majd a frontend ne szűrjön utólag.
- Előny: a `total`, `totalPages` mindig pontos, lapozás helyesen működik.
- Hátrány: edge function módosítás.

**Opció B (csak frontend):** a `useAdminUsers` status mapping-et bővítjük:
- ha `subscription_status === 'banned'` → `status: 'banned'`
- különben aktív/inaktív
- és a frontend oldalszám kijelzést a “szűrt” listához igazítjuk (bonyolultabb, mert a backend totál nem egyezik a kliens szűréssel).

Ajánlás: **Opció A**, mert hosszú távon stabilabb (különösen, ha nő a user-szám).

### 4) UX finomítások (kicsi, de segít)
Fájl: `src/pages/admin/AdminUsers.tsx`
- Ha nincs találat, mutassunk egy rövid tippet:
  - “Ellenőrizd: 1. oldal / szűrők ‘Mind’ / keresés törlése”
- Opcionálisan tegyünk egy “Ugrás az első oldalra” gombot, ha `page > 1`.

## Teszt terv (end-to-end)
1. Admin → Felhasználók oldalon lapozz át pl. 3–7. oldalra.
2. Írd be a keresőbe: `szenteskep` vagy `szenteskep@gmail.com`.
3. Elvárt: automatikusan visszaugrik 1. oldalra, és a találat megjelenik.
4. Próbáld a Plan szűrőt “Író”-ra (writer), majd keresés.
5. Próbáld a státusz szűrőt is (ha megcsináljuk az Opció A-t, a “Tiltott” is értelmesen fog működni).

## Érintett fájlok (várható)
- `src/pages/admin/AdminUsers.tsx` (kötelező)
- `src/hooks/admin/useAdminUsers.ts` (ha a státusz-szűrés logikát tisztítjuk)
- `supabase/functions/admin-get-users/index.ts` (ha a státusz-szűrést szerverre visszük – ajánlott)

## Kockázat és rollback
- Alacsony kockázat: a page reset és out-of-range korrekció csak UI-állapotot érint, nem nyúl adatokhoz.
- Rollback: egyszerűen visszavonható a két useEffect (page reset + page clamp).

## Megjegyzés
Ha a user biztosan benne van a listában, de mégsem látod, a leggyakoribb ok: nem az 1. oldalon vagy, vagy maradt aktív szűrő. A fenti módosítás ezt “bolondbiztossá” teszi.
