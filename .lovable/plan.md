
## Miért nem látszanak a képek? (gyökérok)

A képgenerálás **valójában nem (mindig) fut le a story oldalakra**, mert a „történet generálás” után a UI azonnal elindítja az illusztrációk generálását, miközben a React state (`data.pages`) frissítése **aszinkron**.

Konkrétan:
- `generateStory()` meghívja az `updateData("pages", response.pages)`-t
- ez **nem azonnal** frissíti a hook `data.pages` értékét (csak következő rendernél)
- közben a `StorybookGenerateStep` rögtön hívja `generateAllIllustrations()`-t
- a `generateAllIllustrations()` most a `pagesRef.current`-ből dolgozik, de **a ref szinkronizálása useEffect-ben történik**, tehát ebben a pillanatban még **üres lehet**
- így a loop 0 oldalt talál, „sikeresen” lefut, de **nem állít be `illustrationUrl`-eket**, ezért az előnézetben csak a sárga placeholder marad

Ez magyarázza a tünetet is: „nem lehet megnyitni, csak a sárga helye van ott” – mert nincs URL eltárolva.

---

## Mit fogunk megcsinálni (javítás)

### 1) `pagesRef` azonnali frissítése, nem csak `useEffect`-tel
**Fájl:** `src/hooks/useStorybookWizard.ts`

- A `generateStory()` sikeres válasza után, amikor megjön `response.pages`, azonnal beállítjuk:
  - `pagesRef.current = response.pages`
  - majd `updateData("pages", response.pages)` (state frissítés)
- Így a `generateAllIllustrations()` már a **friss oldallistát** látja, akkor is, ha a React még nem renderelt újra.

Ugyanezt a mintát kiterjesztjük:
- `setPages(pages)` → frissítse `pagesRef.current`-et is
- `updatePage(pageId, updates)` → frissítse `pagesRef.current`-et is (a kiszámolt next pages tömbbel)

Ezzel megszűnik az a versenyhelyzet, hogy a ref „le van maradva” a generálási folyamat elején.

---

### 2) Védelem: ha nincs oldal, ne „sikeresen” fusson le
**Fájl:** `src/hooks/useStorybookWizard.ts`

A `generateAllIllustrations()` elejére:
- ha `pagesRef.current.length === 0`, akkor:
  - dobjunk hibát / térjünk vissza `false`-szal, és
  - `toast.error("Nem találok oldalakat a képgeneráláshoz. Kérlek próbáld újra.")`

Így a felhasználó nem kap hamis „elkészült” állapotot.

---

### 3) `StorybookGenerateStep` pontosabb oldal-szám és állapot
**Fájl:** `src/components/storybook/steps/StorybookGenerateStep.tsx`

Jelenleg itt ez problémás:
- `const pagesCount = data.pages.length || totalPages;`
Mert a `data.pages` prop a generálás pillanatában **stale** lehet.

Javítás:
- az illusztrációk indításakor a `totalIllustrations`-t inkább a korosztály fix oldal-számára állítjuk (ageGroup `pageCount`), és a valódi progress-t a callback (current/total) fogja felülírni.
- Ha a callback `total === 0` vagy a `generateAllIllustrations()` `false`-t ad vissza, a UI menjen „error” fázisba „Próbáld újra” gombbal.

---

### 4) Előnézetben gyors „összes hiányzó kép újragenerálása” gomb (opcionális, de nagyon hasznos)
**Fájl:** `src/components/storybook/steps/StorybookPreviewStep.tsx`

Ha az előnézetben a user sárga placeholdereket lát, legyen egy gomb:
- „Hiányzó képek legenerálása”
ami meghívja a hook `generateAllIllustrations()`-t (progress nélkül is jó).
Ez egy „mentőöv”, ha a generálás közben valami megszakadt.

---

## Hogyan ellenőrizzük, hogy jó lett

1. /create-storybook → végiglépdel → Generálás
2. Történet generálás után illusztrációk fázis: ténylegesen elindul a 16 hívás
3. „Mesekönyv megtekintése” → előnézetben a képek megjelennek (nincs sárga placeholder)
4. Ha mégis van hiányzó kép: „Hiányzó képek legenerálása” gomb pótolja

---

## Érintett fájlok

- `src/hooks/useStorybookWizard.ts`
  - `pagesRef` azonnali frissítése `generateStory`, `setPages`, `updatePage` során
  - guard: ha nincs oldal, ne fusson le „sikeresen”
- `src/components/storybook/steps/StorybookGenerateStep.tsx`
  - „stale data.pages” miatti félrevezető flow csökkentése + jobb error kezelés
- `src/components/storybook/steps/StorybookPreviewStep.tsx` (opcionális, de javasolt)
  - „Hiányzó képek legenerálása” gomb

---

## Kockázatok / mellékhatások

- Minimális: a ref szinkronizálása azonnali assignmenttel biztonságos, mert csak „cache”-ként használjuk, és a state továbbra is a single source of truth.
- A guard miatt előfordulhat, hogy egy korábbi „csendes” hiba most láthatóvá válik (ez jó: nem ad hamis kész állapotot).

