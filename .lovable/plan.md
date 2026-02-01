

## Cél
Oszlopfejléces rendezés hozzáadása az Admin → Felhasználók táblázathoz:
- Kattintásra az adott oszlop szerint rendez
- Másodszori kattintásra megfordítja a sorrendet (asc/desc)
- Oldalanként 10 felhasználó legyen (jelenleg 20)

## Technikai megvalósítás

### 1. Frontend állapot bővítése
**Fájl:** `src/pages/admin/AdminUsers.tsx`

Új state változók:
```text
sortBy: string = "created_at"  (alapértelmezett oszlop)
sortOrder: "asc" | "desc" = "desc"  (alapértelmezett irány)
```

Új segédfüggvény:
```text
handleSort(column: string):
  - ha column === sortBy → sortOrder megfordítása
  - különben sortBy = column, sortOrder = "desc"
  - setPage(1) (rendezés mindig az 1. oldalra ugrik)
```

### 2. Limit módosítása
**Fájl:** `src/pages/admin/AdminUsers.tsx`

A `useAdminUsers` hívásban:
```text
limit: 20 → limit: 10
```

### 3. Hook paraméterek bővítése
**Fájl:** `src/hooks/admin/useAdminUsers.ts`

Új paraméterek:
```text
sortBy?: string
sortOrder?: "asc" | "desc"
```

Ezeket továbbítja a backend felé query paraméterként.

### 4. Backend rendezés implementálása
**Fájl:** `supabase/functions/admin-get-users/index.ts`

Új query paraméterek:
```text
sortBy = url.searchParams.get("sortBy") || "created_at"
sortOrder = url.searchParams.get("sortOrder") || "desc"
```

Támogatott oszlopok:
- `created_at` (regisztráció dátuma)
- `full_name` (név)
- `email`
- `subscription_tier` (csomag)
- `projects_count` (projektek száma)
- `status`

A szűrések után, de a lapozás előtt rendez:
```text
users.sort((a, b) => {
  // oszlopnak megfelelő összehasonlítás
  // sortOrder === "asc" ? normál : fordított
})
```

### 5. Kattintható oszlopfejlécek
**Fájl:** `src/pages/admin/AdminUsers.tsx`

A `TableHead` elemek módosítása:
```text
<TableHead 
  className="cursor-pointer select-none"
  onClick={() => handleSort("full_name")}
>
  <div className="flex items-center gap-1">
    Felhasználó
    {sortBy === "full_name" && (
      <ArrowUp/ArrowDown ikon a sortOrder szerint>
    )}
  </div>
</TableHead>
```

Rendezendő oszlopok:
| Oszlop | sortBy érték |
|--------|--------------|
| Felhasználó | full_name |
| Csomag | subscription_tier |
| Projektek | projects_count |
| Regisztráció | created_at |
| Státusz | status |

Az "Utolsó aktivitás" oszlop nem rendezhető (nincs adat).

### 6. Vizuális visszajelzés
- Lucide ikonok: `ArrowUpDown` (nincs rendezés), `ArrowUp` (asc), `ArrowDown` (desc)
- Aktív oszlop fejléce kiemelve (pl. félkövér vagy szín)

## Érintett fájlok
1. `src/pages/admin/AdminUsers.tsx` - UI, state, kattintás kezelés
2. `src/hooks/admin/useAdminUsers.ts` - új paraméterek
3. `supabase/functions/admin-get-users/index.ts` - szerver oldali rendezés

## Tesztelési lépések
1. Admin → Felhasználók megnyitása
2. Ellenőrizd: 10 felhasználó látszik oldalanként
3. Kattints a "Regisztráció" fejlécre → legújabbak elöl
4. Kattints újra → legrégebbiek elöl
5. Kattints a "Projektek" fejlécre → legtöbb projekt elöl
6. Keresés közben rendezés megmarad
7. Lapozás működik rendezéssel együtt

