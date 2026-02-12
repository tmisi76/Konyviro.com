

# Jelszomodositas javitas -- Dialog popup siker eseten

## Problema

1. A jelszovaltoztatas nem mukodik megbizhatoan -- a `signInWithPassword` hivasok `onAuthStateChange` esemenyt valtak ki, ami megzavarja a session-t
2. A siker visszajelzes (toast) nem feltu eleg -- a felhasznalo nem veszi eszre

## Megoldas

### 1. Egyszerusitett, megbizhato jelszovaltoztatas logika

A jelenlegi megkozelites haromszor hiv `signInWithPassword`-ot, ami felesleges auth esemenyeket general. Uj megkozelites:

- A jelenlegi jelszo ellenorzeset **egy kulon, rovidet eletu Supabase klienssel** vegezzuk, igy az nem zavarja meg a fo session-t
- Vagy egyszerubben: a mar bejelentkezett felhasznalonak csak `updateUser`-t hivunk (a felhasznalo mar hitelesitett), es a jelenlegi jelszo ellenorzeset a fo klienssel vegezzuk, de utana ujra stabilizaljuk a session-t

A legmegbizhatobb: megtartjuk a jelenlegi jelszoval torteno ellenorzest, de a vegleges "visszaellenorzes" lepest elhagyjuk (az okozza a legtobb gondot), es csak az `updateUser` eredmenyere tamaszkodunk.

### 2. Siker popup (AlertDialog)

A toast helyett egy feltuvo AlertDialog popup jelenik meg:
- Zold pipa ikon
- "Jelszó sikeresen módosítva!" cim
- "Most már az új jelszóval tud bejelentkezni." leiras
- "Rendben" gomb a bezarashoz

## Technikai reszletek

### Modositando fajl

| Fajl | Valtozas |
|------|---------|
| `src/components/settings/ChangePasswordSection.tsx` | Logika egyszerusites + AlertDialog popup |

### Uj folyamat

```text
1. signInWithPassword(email, JELENLEGI jelszo) -> ellenorzes
2. delay(500) + getSession() -> session stabilizalas
3. updateUser({ password: UJ jelszo }) -> frissites
4. Ha sikeres -> AlertDialog popup megjelenik
5. Ha sikertelen -> destructive toast hibauzenettel
```

### Kulcsvaltozasok

- Elhagyjuk az 5. lepest (signInWithPassword az uj jelszoval) -- ez okozta a versenyhelyzetet
- Toast helyett AlertDialog popup a sikeres valtoztatasnal
- `showSuccessDialog` state hozzaadasa
- AlertDialog importalasa a meglevo `@/components/ui/alert-dialog` komponensbol

