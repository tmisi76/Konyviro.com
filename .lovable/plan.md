

# Hibalista -- Reszletes nezet Dialog hozzaadasa

## Problema

A Hibalista oldalon a tablazat soraira kattintva nem tortenik semmi. A leiras csonkitva jelenik meg (`truncate max-w-[300px]`), es nincs lehetoseg a teljes leirast megnyitni vagy valaszolni ra.

## Megoldas

Egy uj **reszletes nezet Dialog** hozzaadasa, ami a sorra kattintva megnyilik, es megjeleníti:
- A hiba teljes cimet
- Prioritas es kategoria badge-eket
- A teljes leirast (nem csonkitva)
- Statusz valtoztatas lehetoseget
- Letrehozas es frissites datumot

## Technikai reszletek

### Modositando fajl

| Fajl | Valtozas |
|------|---------|
| `src/pages/admin/AdminIssues.tsx` | Uj `selectedIssue` state + reszletes Dialog |

### Valtozasok

1. **Uj state**: `selectedIssue` (`Issue | null`) -- a kivalasztott issue tarolasara
2. **Sor kattinthato**: A `TableRow`-ra `onClick` es `cursor-pointer` class kerul
3. **Reszletes Dialog**: Uj `Dialog` komponens, ami a kivalasztott issue minden adatat megjeleníti:

```text
+------------------------------------------+
|  [Hiba cime]                         [X] |
|                                          |
|  [Prioritas badge] [Kategoria badge]     |
|  Letrehozva: 2026.02.19                  |
|  Frissitve: 2026.02.19                   |
|                                          |
|  Leiras:                                 |
|  [Teljes leiras szoveg, tordeles         |
|   megtartasaval, whitespace-pre-wrap]    |
|                                          |
|  Statusz:                                |
|  [Select: Nyitott/Folyamatban/stb]       |
|                                          |
|                          [Bezaras]       |
+------------------------------------------+
```

4. A statusz modositas a meglevo `updateIssueStatus` mutaciot hasznalja
5. A Dialog bezarasakor `setSelectedIssue(null)`

Ez a megoldas a meglevo kodbazist minimalis modositassal boviti -- nem kell uj fajl, nem kell uj hook, csak egy state es egy Dialog komponens.
