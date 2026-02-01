# ✅ KÉSZ - Admin felhasználó lista javítása

## Implementált változtatások

### 1) Oldalszám reset keresés/szűrő változásakor ✅
- `src/pages/admin/AdminUsers.tsx` - useEffect hozzáadva, ami reseteli a page-et 1-re és törli a kiválasztásokat

### 2) Out-of-range védelem ✅
- `src/pages/admin/AdminUsers.tsx` - useEffect hozzáadva, ami korrigálja a page-et ha meghaladja a totalPages-t

### 3) Szerver-oldali státusz szűrés ✅
- `supabase/functions/admin-get-users/index.ts` - status paraméter hozzáadva, szerveren szűr (active/inactive/banned)
- `src/hooks/admin/useAdminUsers.ts` - kliens-oldali szűrés eltávolítva

### 4) UX javítás ✅
- Ha nincs találat, megjelenik egy tipp: "Próbáld törölni a szűrőket vagy a keresést"

## Teszt
1. Menj az Admin → Felhasználók oldalra
2. Keress rá: "szenteskep" - automatikusan az 1. oldalon jelenik meg
3. A státusz szűrő most helyesen működik ("Tiltott" is)
