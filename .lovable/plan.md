

# Elfelejtett jelszó - Jelszó beállítás oldal javítása

## Probléma

A jelszó-visszaállító email linkje a `/auth?mode=reset` oldalra irányít, de:

1. Az **Auth.tsx oldal nem kezeli a `mode=reset` paramétert**
2. **Nincs jelszó beállító űrlap** - csak "kérem a visszaállító linket" funkció van
3. A Supabase recovery link az access tokent a URL hash-ben adja át (`#access_token=...`), amit a rendszer nem dolgoz fel

## A Supabase recovery folyamat működése

```text
1. Felhasználó kéri a jelszó visszaállítást
2. send-password-reset meghívja: generateLink({ type: "recovery", redirectTo: ".../auth?mode=reset" })
3. A generált link tartalmazza az access tokent: .../auth?mode=reset#access_token=...&type=recovery
4. A link megnyitásakor a Supabase JS SDK automatikusan feldolgozza a hash-t
5. Az onAuthStateChange-ben "PASSWORD_RECOVERY" event jön
6. Ekkor kell megjeleníteni a jelszó beállító űrlapot
```

## Megoldás

### 1. Új ResetPasswordForm komponens

**Fájl:** `src/components/auth/ResetPasswordForm.tsx`

Új komponens, ami:
- Két jelszó mező (új jelszó + megerősítés)
- Validálás (min. 6 karakter, egyezés)
- `supabase.auth.updateUser({ password })` hívás
- Sikeres visszaállítás után átirányítás a dashboard-ra

### 2. Auth.tsx módosítása

**Fájl:** `src/pages/Auth.tsx`

Változtatások:
- `useSearchParams` és `useLocation` használata a `mode` és hash detektálásra
- Supabase `onAuthStateChange` figyelése a `PASSWORD_RECOVERY` eseményre
- Ha recovery mode aktív → ResetPasswordForm megjelenítése
- Ha sikeres → normál bejelentkezés folytatása

```text
Logika:
1. Ellenőrizzük a URL paramétert: mode=reset
2. Figyeljük az onAuthStateChange-et "PASSWORD_RECOVERY" event-re
3. Ha mindkettő teljesül → ResetPasswordForm komponens
4. Sikeres jelszófrissítés → redirect /dashboard
```

### 3. AuthContext kiegészítése (opcionális)

Az `updatePassword` metódus már létezik - ezt fogjuk használni.

## Érintett fájlok

| Fájl | Változtatás |
|------|-------------|
| `src/components/auth/ResetPasswordForm.tsx` | ÚJ - jelszó beállító űrlap |
| `src/pages/Auth.tsx` | Módosítás - mode=reset kezelés + recovery event |

## Felhasználói élmény a javítás után

```text
1. Felhasználó megkapja az emailt
2. Kattint a "Jelszó visszaállítása" gombra
3. Megnyílik az /auth?mode=reset oldal
4. A Supabase SDK feldolgozza a tokent
5. Megjelenik: "Új jelszó beállítása" űrlap
6. Beírja az új jelszót + megerősítést
7. Mentés → siker → átirányítás a dashboard-ra
```

## Technikai részletek

### ResetPasswordForm komponens struktúra

```text
ResetPasswordForm:
  - useState: newPassword, confirmPassword, loading, error
  - useAuth() → updatePassword()
  - Validáció:
    * Jelszó min. 6 karakter
    * Jelszók egyeznek
  - Submit → updatePassword(newPassword)
  - Sikeres → navigate("/dashboard")
```

### Auth.tsx módosítások

```text
Auth:
  - useSearchParams() → mode paraméter
  - useState: showPasswordReset (boolean)
  - useEffect: onAuthStateChange figyelése
    * Ha event === "PASSWORD_RECOVERY" → setShowPasswordReset(true)
  - Render:
    * Ha showPasswordReset → <ResetPasswordForm />
    * Különben → normál Tabs (login/register)
```

