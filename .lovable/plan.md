

# Jelszóváltoztatás javítás -- versenyhelyzet megszüntetése

## Probléma

A `signInWithPassword` hívás egy `onAuthStateChange` (SIGNED_IN) eseményt vált ki, ami aszinkron módon frissíti a session-t. Ha az `updateUser` hívás hamarabb fut le, mint ahogy az új session stabilizálódik, a jelszófrissítés csendben sikertelen lehet.

## Javítás

A `ChangePasswordSection.tsx` handleSubmit logikáját az alábbira módosítjuk:

1. `signInWithPassword` (jelenlegi jelszó ellenőrzés)
2. **Rövid várakozás** (500ms) -- session stabilizálódásra
3. **Session frissítés** (`getSession`) -- biztosítjuk hogy a legfrissebb session-nel dolgozunk
4. `updateUser({ password: newPassword })`
5. **Rövid várakozás** (500ms)
6. `signInWithPassword` (új jelszóval visszaellenőrzés)
7. Feltűnő siker/hiba toast

## Technikai részletek

### Módosítandó fájl

| Fájl | Változás |
|------|---------|
| `src/components/settings/ChangePasswordSection.tsx` | Várakozások beiktatása a signIn es updateUser hívások közé, session refresh hozzáadása |

### Kulcsváltozások

- Segédfüggvény: `const delay = (ms: number) => new Promise(r => setTimeout(r, ms));`
- 1. lépés után: `await delay(500)` + `await supabase.auth.getSession()`
- 2. lépés után: `await delay(500)` az updateUser és a verification signIn között
- Ez biztosítja, hogy az onAuthStateChange lefusson es a session friss legyen mielőtt a következő lépés indul

