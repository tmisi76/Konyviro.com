# Könyvminőség javítás – 4 problémakör

A 3 AI-értékelés alapján 4 fő probléma kerül javításra. A változtatások a meglévő infrastruktúrára épülnek (a POV enforcement, a karakter rendszer és az auto-lector már létezik – ezeket bővítjük és szigorítjuk).

---

## 1. POV (E/1 vs E/3) konzisztencia

**Probléma:** Egy regényen belül keveredik az „én" és „ő" elbeszélés (a 2. könyvben 329 db E/1 birtokos rag keveredett 734 db E/3-mal).

**Megoldás:**

- **Wizard:** A `Step3BasicInfo.tsx`-ben (fiction ág) a `FictionStyleSettings.pov` mező már létezik, de jelenleg a Step3-ban nincs explicit, kötelező választó. Új blokkot adunk hozzá „Elbeszélői nézőpont" címmel, ahol a 4 opció (E/1, E/3 korlátozott, E/3 mindentudó, váltakozó) választható. Default: `third_limited`. Ha a user nem választ, a Tovább gomb tiltva.
- **Prompt enforcement:** A meglévő `buildPOVEnforcement` (`_shared/prompt-builder.ts`) szabályait szigorítjuk: a system promptba egy „POV LOCK" blokk kerül, amely tételesen tiltja a birtokos rag váltást (pl. `keze` vs `kezem`), és példákat ad a helyes/helytelen formákra. A `write-scene`, `write-section`, `process-next-scene` mind már hívja ezt – a szigorítás automatikusan minden helyre terjed.
- **Auto-lector POV detektor:** Új modul `_shared/pov-detector.ts`. Megszámolja az E/1 (`-m/-em/-am/-om/-im/-ém/...`) vs E/3 (`-a/-e/-ja/-je`) birtokos végződéseket a narrációban (párbeszéden kívül). Ha az arány < 90% a projekt elvárt POV-jához képest, az auto-lector kap egy plusz utasítást: „A jelenetben POV-csúszás van. Egységesítsd [E/1 vagy E/3]-be a narrációt."
- **Régi projekt visszamenőleges javítás:** Nincs migráció szükséges. Új projektnél a Step3 kötelező; régi projektnél default `third_limited`.

## 2. Karakternév-konzisztencia

**Probléma:** Kaelis → Kael, Lánczos Viktor → Görög László (ugyanaz a karakter más néven).

**Megoldás:** A meglévő `characters` táblát használjuk authoritatív névregiszterként.

- **Auto-fill `generate-story` után:** A `generate-story` Edge Function jelenleg visszaad egy story koncepciót szereplőkkel. Bővítjük úgy, hogy a JSON tartalmazzon egy `characters` tömböt (név, szerep, 1 mondatos leírás). A `useBookWizard.ts` a koncepció elfogadásakor (és a wizard végén a project létrehozáskor) ezeket bevezeti a `characters` táblába (név + role + backstory).
- **Authoritative name lock minden prompt-ban:** A `_shared/prompt-builder.ts`-ben a `buildNameLock` (már létezik) most a `characters` táblából tölt teljes listát (name + nickname). Minden írás-prompt megkapja: „TILTOTT VÁLTOZTATÁS: A karakternevek pontosan az alábbiak legyenek, ne rövidítsd, ne magyarosítsd, ne cseréld."
- **Post-hoc validáció:** Új modul `_shared/name-consistency.ts`. A `write-scene` / `process-next-scene` a generálás után kinyeri a tulajdonneveket (nagybetűs tokenek, kivéve mondatkezdő szavakat heurisztikával) és összeveti a registry-vel. Ha új, nem ismert tulajdonnév jelenik meg (és Levenshtein < 3 egy regiszter-névhez), akkor automatikusan javítja a szöveget a hivatalos névre, mielőtt mentené.

## 3. Strukturális hibák: hiányzó fejezetek + címduplikáció

**3a. Hiányzó fejezetek (auto-retry):**

- **Probléma:** A 2. könyvben a TOC 29 fejezetet ígért, csak 21 készült el. A `process-writing-job` cron-job leállhat, vagy egyes fejezetek üresek maradnak.
- **Megoldás:** A `process-writing-job` Edge Function végén checksum lépés: végigmegy a `chapters` táblán, és ha egy `status='completed'` projekt fejezeteinél bármelyik `word_count = 0` vagy `content IS NULL`, azt a fejezetet visszateszi a queue-ba `writing_status='queued'`, `retry_count += 1`. Új mező a `chapters` táblában: `regen_retry_count INT DEFAULT 0`. Ha `regen_retry_count >= 2`, a projekt egy új mezőt kap (`projects.has_missing_chapters BOOLEAN`), és a UI a szerkesztőben badge-et jelenít meg „Hiányzó fejezetek – Újragenerálás" gombbal.

**3b. Fejezetcím-duplikáció:**

- **Probléma:** A fejezetcím belső szakaszhatárolóként újra megjelenik a fejezet törzsében.
- **Megoldás:** A `write-scene` system promptjába explicit tiltás kerül: „NE használd a fejezet címét belső alcímként vagy szakaszhatárolóként. NE írd újra a fejezet címét a prózán belül." Plusz post-processing: a `_shared/quality-checker.ts` `stripMarkdown` mellé `stripChapterTitleDupes(content, chapterTitle)` függvény, amely eltávolítja, ha a fejezetcím önálló sorként megjelenik a tartalomban (case-insensitive trim match).

## 4. Klisé-feketelista bővítése (testi reakciók)

**Probléma:** „torka kiszáradt" 35× (1. könyv), „hangja alig volt több suttogásnál" 32× (2. könyv), stb.

**Megoldás:** Két szinten szigorítunk.

- **Generálási oldal (write-scene/section system prompt):** Frissítjük a meglévő tiltó listát globális limitre: max **3 előfordulás per könyv, max 1 per fejezet** az alábbiakra: `torka kiszáradt`, `mellkasa összeszorult`, `vér a fülében/halántékában dübörgött`, `háta közepén hideg futott végig`, `tenyere verejtékezni kezdett`, `hangja alig volt több suttogásnál/leheletnél`, `gyomra összeszorult/görcsbe rándult`, `szíve a torkában dobogott`. Minden generálásnál a prompt megkapja az adott fejezet előző jeleneteinek és az összes addigi fejezet összesített előfordulás-számát (egyszerű substring count, regex-en).
- **Auto-lector enforcement:** Az `auto-lector` jelenleg „cseréld le KÜLÖNBÖZŐ alternatívákra" mondatot ad. Ezt szigorítjuk: a hívó (`process-next-scene`) átadja a könyv addig generált tartalmából a klisé-előfordulások számát, és az auto-lector promptja: „Az alábbi klisék már túllépték a limitet (max 3/könyv): [lista]. KÖTELEZŐ kicserélned az ÖSSZES előfordulást a jelenetben másra." A `repetition-detector.ts`-be új `detectClicheReactions(text)` függvény kerül, amely substring alapján számol és visszaad konkrét helyettesítő javaslatokat.
- **Globális számláló:** Új mező a `chapters` táblában: `cliche_counts JSONB DEFAULT '{}'`. Minden befejezett jelenet után a `process-next-scene` frissíti a fejezet (és aggregálva a projekt) klisé-számlálóit, ezt használja a következő prompt-építés.

---

## Műszaki részletek

### Adatbázis migrációk
```sql
ALTER TABLE chapters ADD COLUMN regen_retry_count INT DEFAULT 0;
ALTER TABLE chapters ADD COLUMN cliche_counts JSONB DEFAULT '{}'::jsonb;
ALTER TABLE projects ADD COLUMN has_missing_chapters BOOLEAN DEFAULT false;
```

### Új / módosított fájlok

**Új:**
- `supabase/functions/_shared/pov-detector.ts` – E/1 vs E/3 birtokos rag arány elemző
- `supabase/functions/_shared/name-consistency.ts` – Tulajdonnév kinyerés + Levenshtein javítás
- `supabase/functions/_shared/cliche-tracker.ts` – Klisé számláló és helyettesítő javaslatok

**Módosított edge functions:**
- `supabase/functions/generate-story/index.ts` – `characters` tömb a JSON outputban
- `supabase/functions/write-scene/index.ts` – Klisé limit prompt + címduplikáció tiltás + post-hoc név javítás
- `supabase/functions/write-section/index.ts` – Ugyanaz mint write-scene
- `supabase/functions/process-next-scene/index.ts` – Cliche counter frissítés, név validáció hívása
- `supabase/functions/process-writing-job/index.ts` – Hiányzó fejezet checksum + auto-retry
- `supabase/functions/auto-lector/index.ts` – POV-csúszás javítás + szigorúbb klisé prompt
- `supabase/functions/_shared/prompt-builder.ts` – `buildPOVEnforcement` szigorítás, `buildNameLock` `characters` táblából
- `supabase/functions/_shared/quality-checker.ts` – `stripChapterTitleDupes`
- `supabase/functions/_shared/repetition-detector.ts` – `detectClicheReactions`

**Frontend:**
- `src/types/wizard.ts` – Step3 POV mező már létezik a FictionStyleSettings-ben, validáció szigorítása
- `src/components/wizard/steps/Step3BasicInfo.tsx` – POV blokk explicit megjelenítése + kötelező választás (fiction esetén)
- `src/hooks/useBookWizard.ts` – `generate-story` válaszából `characters` insert a `characters` táblába
- `src/components/editor/ChapterSidebar.tsx` (vagy hasonló) – „Hiányzó fejezet" badge + újragenerálás gomb, ha `projects.has_missing_chapters = true`

### Visszamenőleges hatás
- A meglévő projekteket nem törjük el. A POV mező defaultja `third_limited`. A klisé számláló `{}`-ról indul. A regen_retry_count `0`. Régi befejezett könyvek nem indulnak el újra automatikusan.

---

## Mit NEM csinálunk most
- Nem írunk új BookQualityEngine pass-t (a meglévő `refine-chapter` + `auto-lector` elég).
- Nem foglalkozunk a wizard cím / borító / fülszöveg „nem publikálható" kritikájával (1. értékelő pontja) – az külön kör.
- Nem nyúlunk a Step3 többi részéhez (hangnem multi-select, hosszúság-csúszka), azok már működnek.

Mehet az implementáció?