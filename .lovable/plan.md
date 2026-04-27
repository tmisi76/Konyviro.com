## Mit építünk

Egy új **„Könyvsorozat" (Series)** koncepciót, amivel több könyvet egy közös univerzumba lehet kötni. Az AI minden új könyv írásakor automatikusan ismeri az előző kötetek karaktereit, történéseit, helyszíneit, és figyelmeztet, ha ellentmondás keletkezik.

## Felhasználói folyamat

1. **Új könyv létrehozásakor** (vagy meglévő könyvnél a Beállításoknál) a wizard első lépésében új kapcsoló: *„Ez egy könyvsorozat része?"*
   - **Új sorozat indítása** → megadod a sorozat nevét (pl. *„Galaktikus Szövetség"*) és rövid leírását.
   - **Csatlakozás meglévő sorozathoz** → legördülőből kiválasztod, hányadik kötet ez a sorrendben.

2. **Dashboard / Saját könyvek**: új „**Sorozataim**" szekció, ahol látod a sorozatokat, a köteteket sorrendben, és a sorozat „bibliáját" (karakterek, helyszínek, idővonal).

3. **Sorozat bibliája** oldal (`/series/:id`):
   - **Karakterek**: a sorozat összes karaktere egy helyen, melyik kötetben szerepel, fejlődési íve (pl. *„Anna 1. kötet: novice nyomozó → 3. kötet: kapitány"*).
   - **Helyszínek / Világ**: glossary-szerű lista (pl. *„Nova Prime — fővilág, Galaktikus Szövetség központja"*).
   - **Idővonal**: kötetenként a fontos események, kronológiailag.
   - **Konzisztencia napló**: minden olyan AI-figyelmeztetés, amit írás közben kapott a felhasználó.

4. **Írás közben (új kötet generálása)**:
   - Az AI minden szcénánál automatikusan megkapja kontextusként a korábbi kötetek **összefoglalóit**, **karakter-állapotát** és a **világ-bibliát**.
   - Ha karaktert hívnak, az AI az előző kötetekben rögzített néven, kinézettel, beszédstílussal írja meg.

5. **Konzisztencia-ellenőrző**:
   - Egy új „**Konzisztencia ellenőrzés**" gomb a szerkesztőben (és automatikusan minden generált fejezet után).
   - Az AI összeveti az aktuálisan írt szöveget a sorozat bibliájával, és listázza az ellentmondásokat:
     > *„Anna szemszíne korábban kék volt, itt zöld."*
     > *„Az 1. kötetben Géza a Galaktikus Szövetség kapitánya, itt admirálisként szerepel."*
     > *„A Nova Prime az 1. kötet végén megsemmisült, itt érintetlenként van leírva."*
   - Egy kattintással a felhasználó elfogadhatja vagy átírhatja a problémás részt.

## Mit kap az író motor (technikai szinten)

- **Új tábla**: `series` (id, user_id, title, description, bible, created_at).
  - `bible` mező: JSON, AI által karbantartott összefoglaló (világ-szabályok, főbb helyszínek, kulcstémák).
- **Új tábla**: `series_characters` — a karakterek a sorozathoz kötődnek, nem csak egy könyvhöz. Egy karakter több kötetben szerepelhet, kötetenként rögzíthető a fejlődési íve (`series_character_arcs`).
- **Új tábla**: `series_events` — kötetenkénti fontos események idővonala (kötet sorszám, fejezet, esemény leírása, érintett karakterek).
- **Új tábla**: `series_consistency_warnings` — AI által észlelt ellentmondások, státusz (új / elfogadva / javítva / figyelmen kívül hagyva).
- **`projects` tábla** kiegészítés: `series_id` (uuid, nullable), `series_volume_number` (int).

## Új edge functions

- **`generate-series-bible`**: új sorozat indításakor, vagy később bármikor, az AI generálja/frissíti a sorozat bibliáját az eddigi kötetek alapján.
- **`update-series-bible-on-chapter-complete`**: minden befejezett fejezet után frissíti a karakter-állapotot, idővonalat, helyszín-adatbázist a sorozatban.
- **`check-series-consistency`**: bemenet egy fejezet/szakasz szövege + sorozat bibliája. Az AI visszaad egy listát az észlelt ellentmondásokról (típus: karakter / cselekmény / helyszín / idővonal, súlyosság, leírás, javaslat).
- **`get-series-context`**: visszaadja a sorozat összes releváns kontextusát egy adott kötethez (előző kötetek összefoglalói, karakter-állapotok, idővonal) — ezt használja `write-scene` és `write-section`.

## Változtatások a meglévő motorban

- **`write-scene`, `write-section`**: ha a `project.series_id` ki van töltve, a system promptba bekerül egy új szekció:
  ```
  --- KÖNYVSOROZAT KONTEXTUS ---
  Sorozat: {címe}
  Ez a {N}. kötet.
  Korábbi kötetek összefoglalói:
  ...
  Karakterek aktuális állapota:
  ...
  Világ bibliája:
  ...
  KÖTELEZŐ: A karakter-nevek, kinézet, képességek, helyszín-leírások MINDEN PONTBAN EGYEZZENEK a fenti adatokkal!
  ```
- **`process-next-scene`**: minden fejezet befejezése után automatikusan meghívja a `check-series-consistency`-t, és ha talál ellentmondást, beírja a `series_consistency_warnings` táblába (a felhasználó értesítést kap a szerkesztőben).
- **`generate-story`** (történet-koncepció): ha sorozat-kötet, a 3 verzió generálásakor is megkapja a sorozat-bibliát, így a generált karakterek és helyszínek egyezni fognak a korábbiakkal.

## Új UI komponensek (rövid lista)

- `src/pages/Series.tsx` — sorozat-kezelő oldal.
- `src/pages/SeriesBible.tsx` — egy sorozat bibliája (karakterek / helyszínek / idővonal / figyelmeztetések).
- `src/components/series/SeriesSelector.tsx` — wizard első lépésébe építve: „Sorozat része?" kapcsoló + új/meglévő.
- `src/components/series/ConsistencyWarningsPanel.tsx` — szerkesztőben oldalsáv vagy modal a figyelmeztetésekhez.
- `src/components/series/SeriesBibleEditor.tsx` — a felhasználó manuálisan is szerkesztheti / megerősítheti a bibliát.
- Dashboard-on (`src/pages/Dashboard.tsx`) új „Sorozataim" szekció, és a `ProjectCard.tsx`-en sorozat-jelzés (pl. *„Galaktikus Szövetség — 2. kötet"*).

## Korlátok / pontosítások

- A konzisztencia-ellenőrzés **AI-alapú**, így nem 100% biztos — a felhasználó dönt, hogy elfogadja vagy figyelmen kívül hagyja a figyelmeztetést.
- A sorozat bibliája **automatikusan frissül**, de a felhasználó bármikor manuálisan is szerkesztheti.
- Egy könyv **csak egy sorozathoz** tartozhat (legalábbis az első verzióban).
- A meglévő, nem sorozatba szervezett könyveket utólag is hozzá lehet rendelni egy sorozathoz a beállításokban.

## Eredmény

- Bejelölöd, hogy ez egy sorozat — a következő kötet írásakor az AI automatikusan emlékszik mindenre.
- Ha véletlenül ellentmondó dolog kerülne be (pl. karakter szemszíne, halott szereplő visszatérése, képesség-eltérés), **azonnal jelez**.
- Egy átfogó „**sorozat-biblia**" felület, ahol lásd, ki kicsoda, hol járunk a történetben.
