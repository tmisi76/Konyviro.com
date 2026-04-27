## Rövid válasz

Igen, **a szoftver már tudja ezt**! Beállítások → **Saját stílus** menüpont alatt fel tudsz tölteni szövegmintákat, az AI elemzi a mondatszerkezetet, szókincset, hangnemet, párbeszéd-arányt, és ezt a stílusprofilt használja a fikciós könyvírás során.

Viszont jelenleg három korlát van, amit ezzel a feladattal feloldunk:

1. Csak **bemásolni** lehet szöveget — **PDF/DOCX feltöltés nincs**.
2. A stílusprofil **csak fikciós** könyveknél (regény) érvényesül — a szakkönyv/önfejlesztő motorba nincs bekötve.
3. A wizardban **nincs említés** róla, így a felhasználók nem tudják, hogy létezik.

## Mit építünk

### 1. PDF / DOCX / TXT feltöltés a Saját stílus oldalon

A `StyleSettings` modálba egy fájlfeltöltő gomb kerül a beillesztős textarea mellé. Támogatott formátumok: **PDF, DOCX, TXT**. Maximális méret: **20 MB**.

A feltöltött fájlt egy új edge function (`extract-style-sample-text`) feldolgozza:
- **PDF** → szövegkinyerés (`pdfjs-dist` Deno-kompatibilis verzió, vagy a már meglévő DocRaptor/CloudConvert helyett egyszerű `pdfjs` text-extract).
- **DOCX** → szövegkinyerés (`mammoth` ESM verzió).
- **TXT** → közvetlen olvasás.

Visszaad: `{ title, content, wordCount }`. A frontend ezt előtölti a már meglévő modálba, a felhasználó megerősítheti a címet és menti.

Bónusz: ha a fájl nagyon hosszú (>30k szó), automatikusan megvágjuk az első ~30k szóra (az elemzés úgyis 10k-val dolgozik), és figyelmeztetjük.

### 2. Stílusprofil a non-fiction (szakkönyv / önfejlesztő) motorban is

Jelenleg csak `write-section/index.ts` `isFiction === true` ágában fut le a `buildStylePrompt`. Áthelyezzük úgy, hogy **mindig** lefusson, ha a felhasználónak van profilja — fikció esetén a fictionStyle után, non-fiction esetén a NONFICTION/INVESTIGATIVE system prompt után. Ugyanezt megnézzük a `write-scene` és `process-next-scene` függvényekben is — ott is konzisztenssé tesszük (ha még nincs az).

### 3. Felfedezhetőség: említés a wizard onboardingjában

A `BookCreationWizard` első lépésében (vagy egy banner-ben a Step1/Step2 alatt) egy diszkrét info-doboz: *„Van saját írói stílusod? Töltsd fel néhány korábbi szövegedet a Beállítások → Saját stílus menüben, és a könyved a te hangodon szólal meg."* — link a `/settings?tab=style` útvonalra. Ha a felhasználónak már van aktív stílusprofilja, helyette: *„✓ Saját stílusod aktív — a könyved ezzel készül."*

Ugyanez a banner megjelenik a Könyv Coach (`/coach`) oldal tetején is.

### 4. Apró UX javítások a Saját stílus oldalon

- A modálban **két fül**: „Beillesztés" / „Fájl feltöltése".
- Drag & drop zóna a feltöltéshez.
- Feltöltés után előnézet (első 500 karakter), hogy lásd, jól lett-e kinyerve a szöveg.
- Az „Elemzés" gomb mellé egy infó-tooltip: minimum ~500 szó ajánlott.

## Technikai részletek (fejlesztőknek)

**Új edge function:** `supabase/functions/extract-style-sample-text/index.ts`
- Auth szükséges (JWT validáció kódból).
- Bemenet: `multipart/form-data` (file).
- PDF: `pdfjs-dist` ESM importtal Denoba (`https://esm.sh/pdfjs-dist@4...`); page-by-page `getTextContent()`.
- DOCX: `https://esm.sh/mammoth@1.x` `extractRawText`.
- TXT: `await file.text()`.
- Word count szerver oldalon számolva, ugyanazzal a regex-szel mint a frontend.
- 429/402 kezelés nem releváns (nincs AI-hívás benne).
- Limit: 20 MB; ezen felül 413 hiba.

**Módosított fájlok:**
- `src/components/settings/StyleSettings.tsx` — Tabs (Beillesztés / Fájl), drag & drop, előnézet.
- `src/hooks/useWritingStyle.ts` — új `uploadAndAddSample(file: File)` metódus, ami az új edge functiont hívja.
- `supabase/functions/write-section/index.ts` — a `buildStylePrompt` blokkot kihúzzuk az `if (isFiction)` ágból, hogy non-fiction esetén is fusson.
- `supabase/functions/write-scene/index.ts` — ellenőrizzük, hogy mindig lefut, ha van profil.
- `supabase/functions/process-next-scene/index.ts` — ugyanez az ellenőrzés.
- `src/components/wizard/BookCreationWizard.tsx` — diszkrét banner az első lépésben.
- `src/pages/BookCoach.tsx` — ugyanaz a banner.
- `src/pages/Settings.tsx` — `?tab=style` query param támogatás (ha még nincs), hogy a wizardból tudjunk linkelni rá.

**Storage:** A feltöltött fájlt **nem mentjük el** — csak a kinyert szöveget tároljuk a `user_writing_samples` táblában (mint most). Így nem kell bucket, sem új RLS.

**Migrációk:** Nem kellenek — a `user_writing_samples` és `user_style_profiles` táblák már léteznek.

**Memory frissítés:** A `mem://features/editor/style-profile-integration` rekordot frissítjük a non-fiction kiterjesztéssel és a fájlfeltöltéssel.

## Eredmény

- Egy gombnyomásra feltölthetsz egy PDF-et vagy DOCX-et a saját könyvedből/írásodból.
- Az AI elemzi és minden további generáláskor (regény és szakkönyv egyaránt) a te stílusodban ír.
- A wizardban már a könyv elindítása előtt látod, hogy van-e betanított stílusod.