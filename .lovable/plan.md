

# Jelszócsere a Profil beállításokban

## Összefoglaló

Új "Jelszó módosítása" szekció hozzáadása a `ProfileSettings` komponenshez, ahol a felhasználó megadhatja a jelenlegi jelszavát, majd beállíthat egy újat.

---

## Megvalósítás

### 1. ProfileSettings.tsx bovitese

Egy uj kártya ("Jelszó módosítása") hozzáadása a "Személyes adatok" szekció alá:

- **Mezok:**
  - Jelenlegi jelszó (kotelezvo)
  - Uj jelszó (min. 6 karakter)
  - Uj jelszó megerosítése
- **Jelszó megjelenítes/elrejtés** gombok (Eye/EyeOff ikonok)
- **Kulon "Jelszó mentése" gomb** (nem a profil mentes gombja)
- Sikeres valtoztatas utan a mezok urulnek es toast uzenet jelenik meg

### 2. Jelszócsere logika

A `useAuth` hookbol mar elerheto az `updatePassword` fuggveny, ami a Supabase `auth.updateUser({ password })` metodust hívja. Ezt hasznaljuk.

A jelenlegi jelszó ellenorzésehez eloszor ujra bejelentkeztetjuk a felhasznalot (`signInWithPassword`) a megadott jelenlegi jelszóval -- ha az hibas, hibaüzenetet mutatunk.

### 3. Uj fajlok

Nem szukseges uj fajl -- minden a meglevo `ProfileSettings.tsx`-be kerul egy uj szekciokent.

---

## Technikai reszletek

### Jelszócsere folyamat

```text
1. Felhasznalo megadja: jelenlegi jelszó + uj jelszó + megerosites
2. Validacio: uj jelszó >= 6 karakter, uj jelszó === megerosites
3. signInWithPassword(email, jelenlegi jelszó) --> sikeres? tovabb : hiba
4. updatePassword(uj jelszó) --> sikeres? toast + mezo urites : hiba
```

### Modositando fajlok

| Fajl | Valtozas |
|------|---------|
| `src/components/settings/ProfileSettings.tsx` | Uj "Jelszó módosítása" szekció a form utan, kulon kezelt allapottal es submit logikaval |

### UI Megjelenes

```text
┌──────────────────────────────────────────────────────┐
│  Jelszó módosítása                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Jelenlegi jelszó        [••••••••••]  [👁]           │
│  Új jelszó               [••••••••••]  [👁]           │
│  Új jelszó megerősítése  [••••••••••]  [👁]           │
│                                                      │
│  (Minimum 6 karakter)                                │
│                                                      │
│                           [Jelszó mentése]            │
└──────────────────────────────────────────────────────┘
```

A szekció a profilmentés gomb **alatt** jelenik meg, teljesen fuggetlen formaval es allapottal.
