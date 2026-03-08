

# Bejelentkezési és jelszó-visszaállítási hibák diagnosztikája

## Talált problémák

### 1. KRITIKUS: `send-password-reset` hiányzik a config.toml-ból

A `supabase/config.toml` fájlban **nincs bejegyezve** a `send-password-reset` funkció `verify_jwt = false` beállítással. Ez azt jelenti, hogy a rendszer JWT tokent követel meg a híváshoz, de az elfelejtett jelszó funkciót éppen bejelentkezés nélküli felhasználók használják. Eredmény: **401 Unauthorized** hiba, az email soha nem megy ki. Az edge function logok is megerősítik: egyetlen hívás sem jutott el a funkcióig.

### 2. KRITIKUS: `send-welcome-email` szintén hiányzik a config.toml-ból

A regisztrációs üdvözlő email funkció sem szerepel a config.toml-ban, tehát az sem működik.

### 3. BUG: `admin-reset-password` rossz URL paramétert használ

A `admin-reset-password/index.ts` 96. sorában a `redirectTo` értéke `?reset=true`, de az `Auth.tsx` a `?mode=reset` paramétert várja. Ha admin küld jelszó-visszaállító linket, a felhasználó a reset űrlap helyett a sima login formot látja.

### 4. Kisebb kockázat: `listUsers()` paginálás hiánya

A `send-password-reset` funkció az `auth.admin.listUsers()` hívással keresi meg a felhasználót. Ha 1000-nél több felhasználó van, nem találja meg az összes felhasználót. Ez jelenleg valószínűleg nem okoz problémát, de érdemes javítani.

## Megoldás

### Fájl: `supabase/config.toml`
- Hozzáadni: `[functions.send-password-reset]` + `verify_jwt = false`
- Hozzáadni: `[functions.send-welcome-email]` + `verify_jwt = false`

### Fájl: `supabase/functions/admin-reset-password/index.ts`
- 96. sor: `?reset=true` → `?mode=reset`

### Fájl: `supabase/functions/send-password-reset/index.ts`
- A `listUsers()` hívást lecserélni `listUsers({ page: 1, perPage: 1000 })` vagy email alapú keresésre, hogy ne legyen paginálási probléma

## Összefoglaló hatás

| Funkció | Probléma | Javítás után |
|---------|----------|-------------|
| Felhasználói jelszó-emlékeztető | 401 hiba, email nem megy ki | Működik |
| Regisztrációs üdvözlő email | 401 hiba, email nem megy ki | Működik |
| Admin kézi jelszó küldés (`admin-send-credentials`) | Működik (config.toml-ban szerepel) | Változatlan |
| Admin jelszó-visszaállító link | Rossz URL, reset form nem jelenik meg | Helyesen a reset formra irányít |
| Bejelentkezés (`signIn`) | Kódilag rendben van | Változatlan |

