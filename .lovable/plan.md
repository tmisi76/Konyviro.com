
## Cél

A könyv tervezett hosszúságának felső határa **100 000 szó** legyen (jelenleg 50 000). A wizard csak akkor engedjen tovább a hosszúság-választás után, ha a felhasználónak **van elegendő kreditje** (havi limit + extra szó-kredit) a kiválasztott szómennyiség lefedésére.

## Mit változik a felhasználó számára

1. A "Tervezett hosszúság" csúszka most **100 000 szóig** húzható (nem 50 000-ig).
2. Új gyors preset: **"Nagyregény" (100 000 szó)**.
3. A skála jelzők: 1 000 / 25 000 / 50 000 / 100 000.
4. A csúszka alatt egy kis info-sor mutatja:
   - Maradék havi szó + extra kredit (pl. "Elérhető kredit: 75 000 szó")
   - Ha a kiválasztott hossz > elérhető kredit: piros figyelmeztetés:
     *"Nincs elég krediteted ehhez a hosszhoz (70 000 szó). Elérhető: 50 000 szó. Vásárolj extra kreditet vagy csökkentsd a hosszt."*
   - Link/gomb a "Kredit vásárlás" oldalra.
5. **A "Tovább" gomb le van tiltva**, ha a kiválasztott hossz meghaladja az elérhető kreditet.
6. A non-fiction `Step5BookTypeData` csúszkák szintén 100 000 szóig mennek (ahol jelenleg 50 000 a max), és ugyanaz a kredit-ellenőrzés érvényesül a wizard tovább-léptetésekor.

> Megjegyzés: a `mem://features/projects/word-limit-expansion` szerint a 100 000 szó már korábbi terv volt — most ténylegesen érvényesítjük az UI-ban és a léptetés feltételeként is.

## Technikai változások

### 1. Slider felső határ 100 000-re
- `src/components/wizard/steps/Step3BasicInfo.tsx`
  - `Slider max={50000}` → `max={100000}`
  - Skála címkék: `1,000 / 25,000 / 50,000 / 100,000`
- `src/types/wizard.ts`
  - `BOOK_LENGTH_PRESETS` bővítése: `{ value: 100000, label: "Nagyregény" }`
- `src/components/wizard/steps/Step5BookTypeData.tsx`
  - Az összes `Slider max={50000}` → `max={100000}` (~8 előfordulás)
  - A "comprehensive" / "full-course" preset választókhoz opcionálisan extra opció (csak ha logikailag illik), egyébként a slider már elérhető kézzel.

### 2. Kreditfedezet-ellenőrzés a Step3-ban
- `src/components/wizard/steps/Step3BasicInfo.tsx`
  - Importálja a `useSubscription` hookot (`getRemainingWords`).
  - `const remaining = getRemainingWords();`
  - `const hasEnoughCredits = remaining === Infinity || length <= remaining;`
  - `canSubmit = tones.length > 0 && length >= 1000 && hasEnoughCredits;`
  - Inline UI a csúszka alatt:
    - "Elérhető kredit: X szó" (ha `Infinity`, akkor "Korlátlan")
    - Figyelmeztető üzenet + `<Link to="/pricing">Kredit vásárlása</Link>` ha nincs elég.

### 3. Kreditfedezet-ellenőrzés a non-fiction Step5-ben
- `src/components/wizard/steps/Step5BookTypeData.tsx`
  - Ugyanaz a `useSubscription` hook + `length` állapot kombináció.
  - A "Tovább" gomb (a komponens végén lévő submit gomb) tiltva, ha `length > remaining`.
  - Ugyanaz az inline figyelmeztetés a slider alatt (egy közös kis komponensben kiemelve, pl. `<CreditCoverageHint length={length} />`, hogy ne kelljen sokszor másolni).

### 4. Új apró újrafelhasználható komponens
- `src/components/wizard/CreditCoverageHint.tsx`
  - Props: `length: number`
  - Megjeleníti az elérhető kreditet és a figyelmeztetést, ha kevés.
  - Tartalmazza a "Vásárolj kreditet" linket (`/pricing` vagy a meglévő kreditvásárló útvonalra mutatva — a kódban ellenőrizzük, mi a tényleges útvonal, valószínűleg `/pricing` vagy `/buy-credits`).

### 5. A backend / DB nem módosul
- A `target_word_count` továbbra is `integer`, nincs felső korlát az adatbázisban.
- A motor (`useBackgroundWriter`, `process-next-scene`, stb.) tetszőleges szószámmal dolgozik — a 100 000 nem igényel sémamódosítást.

## Mit NEM csinálunk

- Nem növeljük automatikusan a felhasználók havi szó-limitjét — a meglévő tarifa-rendszer marad (HOBBI / PROFI / ÜGYNÖKSÉG).
- Nem engedjük át a kreditfedezet nélküli generálást (ez a kérés lényege).
- Az író motort és az AI promptokat nem módosítjuk — a hosszabb projekt csak több jelenetet/fejezetet jelent.

## Fájlok

- `src/types/wizard.ts` — preset bővítés
- `src/components/wizard/steps/Step3BasicInfo.tsx` — slider max + kredit-ellenőrzés
- `src/components/wizard/steps/Step5BookTypeData.tsx` — slider max-ok + kredit-ellenőrzés
- `src/components/wizard/CreditCoverageHint.tsx` — új komponens

Mehet a módosítás?
