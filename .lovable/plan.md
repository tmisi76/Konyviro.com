

# Nonfiction alkategóriák bővítése politikai/oknyomozó témákkal

## Probléma
A nonfiction alkategóriák (Step 2) nem tartalmaznak "Politika", "Társadalom" vagy hasonló kategóriát, ami szükséges az oknyomozó könyvekhez (pl. Orbán/Fidesz, Trump témák).

## Megoldás

### 1. `src/types/wizard.ts` — Új alkategóriák hozzáadása

A `NonfictionSubcategory` típushoz és a `NONFICTION_SUBCATEGORIES` tömbhöz:

| ID | Cím | Ikon |
|---|---|---|
| `politika` | Politika/Közélet | 🏛️ |
| `tarsadalom` | Társadalom | 👥 |
| `tortenelem` | Történelem | 📜 |
| `bunugy` | Bűnügy/True Crime | 🔍 |

Ezek a kategóriák természetes belépőt adnak az "Oknyomozó" könyvtípushoz a következő lépésben.

### 2. Fájlmódosítások

Egyetlen fájl: `src/types/wizard.ts`
- `NonfictionSubcategory` type bővítése 4 új értékkel
- `NONFICTION_SUBCATEGORIES` tömb bővítése 4 új elemmel

Nincs szükség adatbázis-migrációra, mert a `subcategory` mező unrestricted text a `projects` táblában.

