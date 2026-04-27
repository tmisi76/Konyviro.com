
## Cél

Két új marketing-erős funkció a szakkönyv-szerzőknek:

1. **Kutatás Modul – Tartalom Beolvasás:** A felhasználó beemelheti meglévő blogposztjait, jegyzeteit, PDF-jeit, URL-jeit. Az AI ebből összefüggő szakkönyv-vázlatot és fejezeteket fűz össze.
2. **AI Tördelő & Borítóstúdió:** Egy gombnyomásra **3 különböző stílusú, 4K (nyomda-minőségű) borítóvariáció** + nyomdakész tipográfiai beállítások (PDF export print-ready profillal).

---

## 1) Kutatás Modul – Tartalom Beolvasás (szakkönyv)

### Mit lát a felhasználó
A Kutatás panel tetején új gomb: **„Tartalom hozzáadása"** → modal két fülön:
- **Szöveg beillesztés**: nagy textarea, akár több blogposzt egymás után (címmel elválasztva)
- **Fájl feltöltés**: PDF / DOCX / TXT / MD (drag & drop, max 10 fájl, 20 MB / fájl)
- **URL lista**: blog-URL-ek soronként, az AI letölti és kinyeri a fő tartalmat

A feltöltött nyersanyag a **„Forrásanyagok" (raw_sources)** listában jelenik meg → minden item: cím, kivonat (első 200 karakter), szószám, státusz (`pending` → `extracted` → `analyzed`).

Új gomb a lista alatt: **„Szakkönyv-vázlat generálása ebből az anyagból"** → AI:
1. Témákat klaszterez (mely blogposztok tartoznak össze)
2. Logikus fejezet-sorrendet javasol
3. Hiányokat jelez (mit érdemes még hozzáírnia a szerzőnek)
4. A meglévő wizard `Step6 / outline` lépésbe tölti az eredményt → onnan futhat a normál szakkönyv-író motor

A scene/section író motor pedig a generálás során a `raw_sources.extracted_text` mezőt is megkapja kontextusként (új blokk a promptban: `--- SAJÁT FORRÁSANYAG ---`), így tényleg a felhasználó stílusát és tényeit használja, nem hallucinál.

### Technikai részletek

**Új tábla: `raw_sources`**
| oszlop | típus | megjegyzés |
|---|---|---|
| id | uuid PK | |
| project_id | uuid | |
| user_id | uuid | RLS |
| source_kind | text | `text` / `file` / `url` |
| original_filename | text | |
| storage_path | text | `project-assets` bucket |
| title | text | AI által javasolt vagy user-adott |
| extracted_text | text | tisztított plain-text |
| word_count | int | |
| topic_cluster | text | AI által hozzárendelt téma |
| status | text | `pending` / `extracted` / `analyzed` / `failed` |
| created_at, updated_at | timestamptz | |

RLS: a project tulajdonosa CRUD-ol.

**Új edge functions**
- `ingest-raw-source` – fogadja a feltöltést (text/file/URL). PDF/DOCX → szövegre bontás (`pdf-parse` / `mammoth` esm.sh), URL → a meglévő `fetch-url-metadata` mintára `Readability` modullal. Beírja a `raw_sources` táblába.
- `analyze-raw-sources` – Lovable AI (`google/gemini-2.5-pro`, nagy kontextus): klaszterezi a témákat, javasol fejezet-struktúrát → visszaad JSON outline-t, amelyet a kliens a meglévő wizard outline-jához fűz hozzá / cserél.
- A `write-section/index.ts` és `generate-section-outline/index.ts` beolvassa az adott projekt `raw_sources` releváns chunkjait (téma-kulcsszó alapján) és bevágja a promptba.

**Új komponensek**
- `src/components/research/RawSourceUploader.tsx` – tabs (Szöveg / Fájl / URL)
- `src/components/research/RawSourcesList.tsx` – lista státuszokkal
- `src/components/research/GenerateOutlineFromSourcesButton.tsx`
- `src/hooks/useRawSources.ts`

**Storage**
A meglévő `project-assets` publikus bucket alá: `raw-sources/{projectId}/{uuid}.{ext}`.

**Kreditek**
- Feltöltés / kinyerés: ingyenes
- AI vázlat-generálás 1000 szó kreditet fogyaszt (per futtatás), a meglévő `use_extra_credits` / `increment_words_generated` logikán keresztül.

---

## 2) AI Tördelő & Borítóstúdió – 3 db 4K variáció

### Mit lát a felhasználó

A Borító Tervezőben (`/cover-designer/:projectId`) a **„Borító Generálása"** gomb mellé új gomb: **„3 variáció generálása (4K)"**. Egy futtatásra **3 különböző stílusú, könyv-arányú (2:3), nagy felbontású (legalább 2048×3072) borítót** ad vissza, mindegyik más megközelítéssel (pl. illusztrált / fotórealisztikus / minimal-typo). A galéria ugyanúgy mutatja őket, kiválasztható a végleges.

A 3 variáció költsége egy összegben kerül kommunikálásra a UI-on, és egyszer lesz levonva a tranzakció elején (ld. lent).

A meglévő `ProjectExport` / `BookExportModal` PDF útvonalához új preset: **„Nyomdakész (Print-ready)"**:
- A5 / B5 választó
- belső margók (gutter) automatikus
- futófejléc + oldalszám páros/páratlan elrendezésben
- bekezdés-behúzás, özvegy/árva sor minimalizálás CSS-ből
- automatikus címnegyed (címoldal, copyright, tartalomjegyzék, ajánlás)
- 300 DPI képek (a kiválasztott 4K borító első oldalként beemelve)

### Technikai részletek

**`generate-cover/index.ts` bővítés**
- Új request mező: `variations: number` (1 vagy 3, default 1).
- 3 esetén **3 párhuzamos AI hívás** `Promise.allSettled`-lel, mindegyik más style-promptot kap (`illustrated`, `photographic`, `typographic-minimal`).
- Modell: `google/gemini-3-pro-image-preview` (Nano Banana Pro, magas minőség). A prompthoz hozzáfűzzük: *„Generate at maximum resolution, book cover 2:3 portrait orientation, print-ready 300 DPI feel, no text artifacts."*
- Kreditek: `COVER_GENERATION_COST * darabszám` (új konstans `COVER_VARIATIONS_COST = 3 * 2000 = 6000`). Az ellenőrzés ugyanúgy `monthly + extra` balance alapján. Sikertelen variáció esetén a sikeresek arányában csak a tényleg lefutott hívásért von kreditet.
- Mind feltöltődik a `covers` táblába külön rekordként (hogy egyenként választható legyen).

**Print-ready PDF preset (`export-book/index.ts`)**
- Új `settings.preset === "print-ready"` ág:
  - `pageSize`: A5 (default) vagy B5
  - külön CSS print-szabályok: `@page { margin … }`, `prince-pdf-page-marks`, `widows: 3; orphans: 3`
  - automatikus ToC + címnegyed beillesztése
  - a kiválasztott `covers.image_url` (legmagasabb-felbontású) első oldalként beemelve, full-bleed
- A meglévő DocRaptor / CloudConvert pipeline-t használjuk, a már beállított `DOCRAPTOR_API_KEY` secrettel.

**Új UI komponensek**
- `src/components/covers/VariationButton.tsx` (a CoverDesigner oldalon)
- `src/components/export/PrintReadyPresetCard.tsx` (a BookExportModal-ban új tile)
- A meglévő `ExportSettingsPanel`-ba gond nélkül illeszthető új checkbox / radio.

---

## Üzleti / krediti logika összefoglaló

| Művelet | Költség (szó-kredit) |
|---|---|
| Forrás-fájl feltöltés / kinyerés | 0 |
| AI vázlat-generálás meglévő anyagból | 1 000 |
| 1 borító (változatlan) | 2 000 |
| 3 borító csomag (új) | 6 000 |
| Print-ready PDF export | 0 (csak a normál export-limit) |

A free tier nem érheti el a 3-borító csomagot (üzenet: „Bővíts csomagot vagy vegyél kreditet").

---

## Adatbázis-migráció (összefoglaló)

```sql
create table public.raw_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  user_id uuid not null,
  source_kind text not null check (source_kind in ('text','file','url')),
  original_filename text,
  storage_path text,
  title text,
  extracted_text text,
  word_count int default 0,
  topic_cluster text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.raw_sources enable row level security;
-- 4 RLS policy a meglévő projects-mintára (owner CRUD)
create index on public.raw_sources(project_id);
```

---

## Érintett fájlok

**Új fájlok**
- `supabase/functions/ingest-raw-source/index.ts`
- `supabase/functions/analyze-raw-sources/index.ts`
- `src/components/research/RawSourceUploader.tsx`
- `src/components/research/RawSourcesList.tsx`
- `src/components/research/GenerateOutlineFromSourcesButton.tsx`
- `src/hooks/useRawSources.ts`
- `src/components/covers/VariationButton.tsx`
- `src/components/export/PrintReadyPresetCard.tsx`
- DB migráció: `raw_sources` tábla + RLS

**Módosított fájlok**
- `src/components/research/ResearchView.tsx` (új „Forrásanyagok" fül)
- `src/pages/CoverDesigner.tsx` (3-variáció gomb + galéria)
- `src/components/export/BookExportModal.tsx` + `ExportSettingsPanel.tsx` (print-ready preset)
- `supabase/functions/generate-cover/index.ts` (variations param + magasabb felbontás)
- `supabase/functions/export-book/index.ts` (print-ready preset)
- `supabase/functions/write-section/index.ts` + `generate-section-outline/index.ts` (`raw_sources` kontextus)
- `src/constants/credits.ts` (új `COVER_VARIATIONS_COST`, `OUTLINE_FROM_SOURCES_COST`)

---

## Mi marad ki tudatosan
- A wizardba most nem építjük be a forrás-feltöltést – a Kutatás panelből indul a flow, hogy meglévő projekteknél is működjön. (Később egy lépéssel beilleszthető.)
- Borító-szerkesztés (inpainting) változatlan marad – a 3-variáció csak generálásra vonatkozik.
- Hivatalos „nyomda-előírás" (CMYK, kifutó, ICC profil) az első iterációban nem cél – a print-ready PDF a beltartalom + 4K borító szintjén lesz nyomdakész. Ezt később külön lépésben lehet bővíteni.
