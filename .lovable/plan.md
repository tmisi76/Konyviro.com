
# Javítás: Email Leiratkozás Működése

## Probléma Azonosítása

A `supabase/config.toml` fájlból hiányzik az `unsubscribe-email` edge function beállítása. Emiatt alapértelmezetten `verify_jwt = true` módban fut, ami:

1. Amikor egy felhasználó rákattint az emailben lévő leiratkozási linkre
2. A böngésző nem küld JWT tokent (mert nincs bejelentkezve)
3. A Supabase elutasítja a kérést (401 Unauthorized)
4. A hibaválasz raw szövegként jelenik meg fekete háttérrel

## Megoldás

Hozzáadjuk a hiányzó edge function konfigurációkat a `config.toml`-hoz:

```toml
[functions.unsubscribe-email]
verify_jwt = false

[functions.send-campaign-email]
verify_jwt = false

[functions.process-scheduled-campaigns]
verify_jwt = false
```

## Érintett Fájl

| Fájl | Művelet |
|------|---------|
| `supabase/config.toml` | Új bejegyzések hozzáadása |

## Miért kell `verify_jwt = false`?

- **unsubscribe-email**: A felhasználó email kliensből kattint rá, nincs JWT
- **send-campaign-email**: Adminok hívják, de belső autentikációval ellenőrzik a jogosultságot
- **process-scheduled-campaigns**: Cron job hívja, nincs felhasználói JWT

---

## Biztonsági Megjegyzés

Az `unsubscribe-email` function a token alapján azonosítja a felhasználót, nem JWT alapján. A token egyedi és az email címhez van kötve, így biztonságos a publikus elérés.
