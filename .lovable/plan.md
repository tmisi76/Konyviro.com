

# Teljes rendszer audit -- Éles indulás előtti hibák és hiányosságok

---

## KRITIKUS HIBÁK (azonnali javítás szükséges)

### 1. Edge Functions hiányoznak a config.toml-ból
A következő edge function-ök léteznek a `supabase/functions/` mappában, de **nincsenek bejegyezve** a `supabase/config.toml`-ba. Alapértelmezésben a JWT verifikáció be van kapcsolva, ami azt jelenti, hogy ezek a függvények **401-et dobhatnak** jogosult hívások esetén is, ha nem autentikált kliensről hívják őket:

**Kritikus (felhasználók által közvetlenül hívottak, JWT nélkül is kell működniük):**
- `proofread` -- a lektorálás funkció, kliensről hívják JWT-vel, de a config.toml-ból hiányzik
- `verify-share-password` -- publikus könyvolvasó jelszóellenőrzés, nincs auth
- `generate-story-ideas` -- wizard Step4, autentikált kliens hívja
- `generate-story` -- wizard Step5, autentikált kliens hívja
- `generate-chapter-outline` -- wizard Step6
- `generate-next-outline` -- background writer poller hívja
- `create-book-share` -- megosztás létrehozása (saját auth-t csinál)
- `update-book-share` -- megosztás módosítása
- `export-storybook` -- storybook exportálás
- `generate-storybook` -- storybook generálás
- `generate-storybook-illustration` -- illusztrációk generálása

**Közepes (admin/rendszer hívja):**
- `send-support-notification` -- support ticket értesítés
- `send-ticket-reply-email` -- ticket válasz email
- `verify-session-token` -- session token ellenőrzés
- `process-drip-campaign` -- drip kampány feldolgozás
- `reset-credits` -- kredit reset (cron job)

**Megoldás:** Mind hozzáadandó a `supabase/config.toml`-hoz `verify_jwt = false` beállítással.

### 2. Google OAuth gomb nem működik
A `GoogleAuthButton.tsx` egy placeholder -- csak `console.log`-ot ír, nem csinál semmit. Ez éles rendszerben félrevezető, mert a gomb megjelenik de nem működik.

**Megoldás:** Vagy implementálni kell a Google OAuth-ot, vagy el kell rejteni a gombot amíg nincs konfigurálva.

### 3. `listUsers()` paginálási probléma (több fájlban)
Több edge function `auth.admin.listUsers()` hívást használ paginálás nélkül (alapértelmezett: max 1000 felhasználó). Ha 1000+ felhasználó lesz, ezek nem találják meg az összes usert:
- `send-campaign-email/index.ts` (3 hívás)
- `send-bulk-email/index.ts`
- `unsubscribe-email/index.ts`
- `stripe-webhook/index.ts`
- `process-scheduled-campaigns/index.ts` (3 hívás)

**Megoldás:** Mindenhol `{ page: 1, perPage: 1000 }` paramétert kell adni, vagy email alapú keresést használni ahol egyetlen user kell.

---

## KÖZEPES HIBÁK

### 4. Placeholder linkek az Auth és Footer oldalon
- `Auth.tsx` 124-129. sor: ÁSZF és Adatvédelem linkek `href="#"` -- nem vezetnek sehova
- `Footer.tsx`: Social media linkek és ÁSZF/Cookie linkek mind `href="#"`

### 5. DialogContent ref warning (konzol)
A `KeyboardShortcutsModal` `DialogContent`-je ref warning-ot dob. Nem kritikus, de éles rendszerben zavaró konzol hibaüzenet.

### 6. React Router v6 deprecation figyelmeztetések
Két future flag warning (`v7_startTransition` és `v7_relativeSplatPath`). Nem befolyásolja a működést, de éles rendszerben érdemes kezelni.

---

## BIZTONSÁGI MEGJEGYZÉSEK

### 7. Stripe kulcs jogosultsági hiba
A `check-subscription` edge function logja jelzi: `"The provided key does not have the required permissions for this endpoint"` -- a `rak_credit_note_read` jogosultság hiányzik a Stripe restricted key-ről. A számlák lekérdezése jelenleg nem működik (de a kód gracefully kezeli).

### 8. Admin route-ok nem ellenőrzik az admin jogot a router szinten
Az admin route-ok csak `ProtectedRoute`-on mennek át (bejelentkezés ellenőrzés), az `AdminLayout` komponens ellenőrzi az admin jogot és redirect-el. Ez működik, de egy extra biztonsági réteg (dedicated `AdminRoute` wrapper) robusztusabb lenne.

---

## KISEBB PROBLÉMÁK / FEJLESZTÉSI JAVASLATOK

### 9. Sok `.single()` hívás insert utáni select-ekben
Insert + `.select().single()` használata hiba-érzékeny ha unique constraint violation van. A legtöbb helyen ez rendben van, de érdemes figyelni.

### 10. Hardcoded domain: `konyviro.com`
75 helyen van hardcoded `konyviro.com` URL az edge function-ökben. Ha a domain változik, mindent kézzel kell átírni. Ideális lenne egy `APP_URL` environment variable központi használata.

---

## JAVASOLT VÉGREHAJTÁSI SORREND

1. **config.toml frissítés** -- 16 edge function bejegyzés hozzáadása (KRITIKUS)
2. **Google OAuth gomb** -- elrejtés vagy implementálás
3. **listUsers paginálás** -- 7+ edge function javítása
4. **Placeholder linkek** -- ÁSZF/Adatvédelem oldalak vagy linkek eltávolítása
5. **Konzol warning-ok** -- DialogContent ref fix, Router future flags

