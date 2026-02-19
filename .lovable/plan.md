
# Megoldott hibak elrejtese alapertelmezetten

## Valtozas

A `filteredIssues` szurest bovitjuk: alapertelmezetten kiszurjuk a `resolved` es `wont_fix` statuszu issue-kat. Egy uj toggle gomb engedi a felhasznalonak megjeleníteni oket.

## Technikai reszletek

### Modositando fajl: `src/pages/admin/AdminIssues.tsx`

**1. Uj state** (73. sor korul):
- `const [showResolved, setShowResolved] = useState(false);`

**2. `filteredIssues` szures bovitese** (218-223. sor):
- Ha `showResolved === false` ES `statusFilter === "all"`, akkor kiszurjuk a `resolved` es `wont_fix` statuszu issue-kat
- Ha a felhasznalo kifejezetten a "Megoldva" vagy "Nem javitjuk" szurot valasztja, akkor termeszetesen azok jelennek meg

**3. Toggle gomb a szurok melle** (274-295. sor korul):
- A kereses es statusz szuro melle kerul egy `Button` (variant: outline), ami a `showResolved` allapotot valtja
- Szoveg: "Megoldottak mutatasa" / "Megoldottak elrejtese"
- `Eye` / `EyeOff` ikon a lucide-react-bol

**4. Megoldott issue-k szama** (badge a gombon):
- A gomb mellett megjelenik a megoldott issue-k szama badge-kent, hogy a felhasznalo tudja, hany el van rejtve
