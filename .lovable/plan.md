

## Probléma
1. **Hiba oka**: A `evacsillakepzes@gmail.com` cím már létezik az auth táblában. Ez gyakori eset, ha:
   - A felhasználó valóban regisztrált korábban
   - Egy korábbi admin létrehozás félig lefutott (auth user megvan, profil hiányzik vagy hibás)
2. **UX probléma**: A felhasználó csak a homályos „Edge Function returned a non-2xx status code" üzenetet látja, nem érti mi a baj.
3. **Nincs visszaállítási út**: Ha a user „árva" (auth létezik, profil rossz), nem tudja az admin újrahúzni.

## Javítás

### 1. `admin-create-user` edge function — okosabb hibakezelés
- **Email létezés ellenőrzése előre** (`auth.admin.listUsers` + filter) a `createUser` hívás előtt.
- Ha létezik:
  - Lekérni a meglévő profilt
  - **Ha a profil free/üres** → a meglévő auth usert vesszük át, csak frissítjük a profilt az új előfizetéssel + opcionálisan jelszóreset emailt küldünk. Visszaadjuk: `mode: "updated_existing"`.
  - **Ha már aktív fizetős előfizetése van** → tiszta hibaüzenet magyarul: „Ez az email már aktív előfizetéssel rendelkezik. Használja a Szerkesztés funkciót."
- A válasz mindig 200-as legyen strukturált `{ success, mode, message }` mezőkkel — így a frontend nem „non-2xx"-et lát, hanem értelmes üzenetet.

### 2. `AddUserModal.tsx` — érthető visszajelzés
- A toast az `error.message` helyett a `data.message`-et használja, ha létezik.
- Sikeres „updated_existing" esetén külön zöld toast: „Meglévő felhasználó frissítve új előfizetéssel".
- Hibás esetben (pl. már aktív sub) sárga warning toast a magyar üzenettel.

### 3. Edge funkciók átvizsgálása (a kérés szerint)
Ellenőrzöm szúrópróba-szerűen a kritikus admin funkciókat (csak hibakezelés/CORS szempontból):
- `admin-get-users` — működik (200-as logokból látszik)
- `admin-update-subscription`, `admin-ban-user`, `admin-delete-user`, `admin-reset-password`, `admin-send-credentials`, `admin-create-user` — egységes hibakezelési minta ellenőrzése (CORS header minden válaszban, status code helyesen)
- A többi 30+ edge funkciót csak akkor módosítom, ha konkrét bug derül ki, hogy ne legyen scope creep.

### Nem módosítok
- Nem nyúlok az AI/írás funkciókhoz, fizetés/webhook funkciókhoz, email küldéshez — ezek a logok alapján működnek.

## Érintett fájlok
- `supabase/functions/admin-create-user/index.ts` (fő javítás)
- `src/components/admin/AddUserModal.tsx` (UX javítás)
- Esetleg más admin edge functions, ha ellenőrzéskor hiányos hibakezelést találok

## Tesztelési forgatókönyv
1. Próbálj felvenni új, sosem használt emailt → létrejön normálisan
2. Próbálj felvenni meglévő free usert → „Meglévő felhasználó frissítve" üzenet, profil frissül
3. Próbálj felvenni meglévő aktív fizetős usert → érthető magyar hiba „Használja a Szerkesztés funkciót"

