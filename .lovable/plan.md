

# Admin jelszócsere form a Műveletek fülön

## Mit csinálunk

A "Műveletek" fülön a jelszó kezelés szekcióba bekerül egy új form, ahol az admin kétszer beírja az új jelszót, és a "Jelszó mentése" gombbal lecseréli a felhasználó jelszavát. Az új jelszót emailben is elküldi a Resend API-n keresztül.

## Változtatások

### 1. EditUserModal.tsx -- Új jelszócsere form

A "Jelszó kezelés" szekcióba a meglévő gombok alá bekerül:
- Két jelszó mező (új jelszó + megerősítés)
- "Jelszó mentése és küldés emailben" gomb
- Sikeres/sikertelen visszajelzés toast-tal
- Minimum 6 karakter validáció

### 2. admin-reset-password edge function -- Új `set_custom_password` action

A meglévő edge function kap egy harmadik action típust: `"set_custom_password"`, ami a request body-ban kapott `password` mezőt használja a generált jelszó helyett. Ugyanúgy elküldi emailben a Resend-en keresztül.

## Technikai részletek

| Fájl | Változás |
|------|---------|
| `src/components/admin/EditUserModal.tsx` | Új jelszó form a Műveletek fülön (2 input + gomb), új state-ek (`newPassword`, `confirmPassword`), `handleSetCustomPassword` handler |
| `supabase/functions/admin-reset-password/index.ts` | Új `set_custom_password` action, `password` paraméter kezelése |

### Edge function bővítés

```text
action = "set_custom_password"
body: { user_id, action, password }

1. Admin ellenőrzés (meglévő)
2. supabaseAdmin.auth.admin.updateUserById(user_id, { password })
3. Email küldés Resend-en keresztül az új jelszóval
4. Activity log
```

### Frontend form

```text
Jelszó kezelés szekción belül:
  [Meglévő gombok: Reset link | Generálás]
  
  Új jelszó beállítása:
  [Új jelszó input        ]
  [Jelszó megerősítése    ]
  [Jelszó mentése és küldés emailben] gomb
```

A Resend API-t a meglévő edge function már használja -- ugyanaz az email sablon, csak a jelszó az admin által megadott lesz.
