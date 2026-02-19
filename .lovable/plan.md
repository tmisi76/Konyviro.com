
# Lezart hibak elrejtese a listabol

## Valtozas

A `filteredIssues` szurest egyszerusitjuk: a `resolved` es `wont_fix` statuszu hibak CSAK akkor jelennek meg, ha a felhasznalo a statusz szuroben kifejezetten azt az allapotot valasztja. A korabbi `showResolved` toggle gombot eltavolitjuk, mert nincs ra szukseg.

## Technikai reszletek

### Modositando fajl: `src/pages/admin/AdminIssues.tsx`

**1. `showResolved` state es `resolvedCount` torlese**
- Eltavolitjuk a `showResolved` state-et es a `resolvedCount` szamitast, mert a toggle gombra nincs szukseg

**2. `filteredIssues` szures egyszerusitese (221-232. sor)**
- Ha `statusFilter === "all"`, kiszurjuk a `resolved` es `wont_fix` statuszu elemeket
- Ha `statusFilter === "resolved"` vagy `statusFilter === "wont_fix"`, azok termeszetesen megjelennek
- Barmi mas szuro (`open`, `in_progress`) a szokasos modon mukodik

```
filteredIssues = issues.filter(issue => {
  matchesSearch = ...
  if (statusFilter === "all" && (status === "resolved" || status === "wont_fix")) return false
  if (statusFilter !== "all" && status !== statusFilter) return false
  return matchesSearch
})
```

**3. Toggle gomb eltavolitasa a UI-bol**
- A `showResolved` gomb es a hozza tartozo badge torlese a szuro savbol
