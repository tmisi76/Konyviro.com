## Audit eredmény: mit találtam

Átnéztem a teljes író-pipeline-t (wizard → generate-story → outline → write-scene/write-section → process-next-scene → auto-lector). A rendszer **alapvetően jól működik** a kezdeti karaktergenerálásnál, de **4 ponton szakad meg a kulturális/névi konzisztencia**, ami hosszabb könyveknél problémát okoz.

### Mi működik már jól ✅
- A wizard 3. lépésében kiválasztott **nemzetiség** (magyar, angol, japán, fantasy stb.) eljut a `generate-story` funkcióhoz, és a kezdeti karakterek nevei helyesen az adott kultúrából lesznek.
- A **karakter név-zár** (`buildCharacterNameLock`) minden jelenetnél megvédi az adatbázisban tárolt neveket attól, hogy az AI átírja vagy magyarosítsa őket.
- A **POV-zár** (nézőpont) működik.
- A **karakter-előzmények** (ki mit csinált korábban) átadódnak.
- A **sorozat-bibilia** (series context) átadódik a folytatásoknál.

### Mi szakad meg ❌

**1. A `fiction_style.characterNationality` NEM jut el a író motorba**
A `buildFictionStylePrompt` függvény (`_shared/prompt-builder.ts`) csak a `setting` mezőt teszi a promptba, a kiválasztott nemzetiséget kihagyja. Következmény: ha a könyv közepén az AI **új karaktert** vezet be (pl. mellékszereplőt, akit a wizard nem definiált), annak a neve random kultúrából lehet.

**2. Az outline-generátorok teljesen "kultúravakok"**
A `generate-detailed-outline`, `generate-chapter-outline`, `generate-next-outline`, `generate-section-outline` egyike sem kapja meg a nemzetiségi irányelvet. Így ha az outline új karaktert javasol, az nem garantáltan illeszkedik.

**3. A `auto-lector` nem ellenőrzi a név-konzisztenciát**
A jelenlegi lektor-folyamat nyelvtani és stilisztikai javításokat végez, de **nem keresi**, hogy felbukkant-e valamelyik fejezetben olyan karakternév, ami nincs a `characters` táblában (azaz "vendégszereplő" probléma), vagy hogy egy név más-más változatban fordul-e elő (pl. "Anna" és "Annácska" vs. "Anna" és "Anikó").

**4. A helyszín-konzisztencia nincs ellenőrizve**
A `setting` mező a fiction_style-ban szabad szöveg (pl. "1920-as évek Budapest"), de később semmi nem ellenőrzi, hogy a fejezetekben fel-fellépő helyszínek (utcák, épületek, városok) konzisztensek-e. Ha az egyik fejezetben a "Váci utca" szerepel, a másikban "Vámház körút", akkor nincs garancia a koherenciára.

---

## Javítási terv (4 lépés)

### 1. lépés: Nemzetiségi irányelv beépítése a `buildFictionStylePrompt`-be
**Fájl:** `supabase/functions/_shared/prompt-builder.ts`

Bővíteni a függvényt, hogy a `characterNationality` mezőt is kitegye a promptba, a `NATIONALITY_GUIDE` lookup táblával együtt (amit a `generate-story`-ból át kell mozgatni, hogy mindkét helyen elérhető legyen).

**Hatás:** Minden jelenet- és szakaszgeneráláskor (write-scene, write-section, process-next-scene) az AI tudni fogja, hogy ÚJ karakternek milyen kulturális hátterű nevet kell adnia.

### 2. lépés: Outline-generátorok kulturális tudatossága
**Fájlok:** `supabase/functions/generate-detailed-outline/index.ts`, `generate-chapter-outline/index.ts`, `generate-next-outline/index.ts`

Az outline-generátorok promptjába bevezetni egy rövid "új karakter névkonvenciók" blokkot, ami a `project.fiction_style.characterNationality` és a `project.fiction_style.setting` alapján irányítja az AI-t.

**Hatás:** Az outline-ban javasolt új mellékszereplők neve illeszkedni fog a választott kultúrához.

### 3. lépés: Név-konzisztencia auditor (új edge function)
**Új fájl:** `supabase/functions/audit-name-consistency/index.ts`

Új edge function, ami egy projekt összes fejezetén végigfut és:
- Kigyűjti az összes nagy kezdőbetűs tulajdonnévnek tűnő tokent (regex + AI)
- Összeveti a `characters` táblával
- Keres "vendégszereplőket" (nem regisztrált neveket)
- Keres név-variánsokat (pl. "Kovács Anna" vs. "Anna Kovács" vs. "Annus")
- Keres helyszín-inkonzisztenciát (pl. "Váci utca" / "Vámház körút" összevetés)
- Eredményt ír a `quality_issues` táblába (severity szerint)

**Frontend integráció:** A meglévő **Konzisztencia Inbox** (`ConsistencyInbox.tsx`) automatikusan megjeleníti az új issue-kat — egy gomb hozzáadásával manuálisan elindítható az audit.

### 4. lépés: Konzisztencia gomb az editorba
**Fájl:** `src/components/quality/ConsistencyInbox.tsx`

Egy "🔍 Teljes ellenőrzés most" gomb, ami meghívja az új `audit-name-consistency` edge functiont, és progress indicator mellett megmutatja az eredményt.

---

## Műszaki részletek

**Adatbázis:** A `quality_issues` tábla már létezik, így nem kell migráció. Az új issue-ok a meglévő struktúrába mennek (`issue_type`: `name_consistency` / `location_consistency`, `severity`: `low/medium/high`).

**Költség:** Az audit egy projektre kb. 1 AI hívás (Gemini 2.5 Flash, structured output) — minimális.

**Backward kompatibilitás:** A meglévő projektek is profitálnak (a 1. és 2. lépés azonnal érvényesül a következő íráskor; a 3-4. lépés bármikor manuálisan futtatható).

---

## Mit fog érzékelni a felhasználó

- Új könyveknél: **a karakternevek végig a választott kultúrában** maradnak (még a 30. fejezetben felbukkanó mellékszereplők is).
- Meglévő könyveknél: egy gombnyomással **megkapja a hibalistát** az inkonzisztens nevekről és helyszínekről.
- Az outline-ban javasolt új karakterek neve **azonnal helyes kultúrából** származik.

Mehet a megvalósítás?