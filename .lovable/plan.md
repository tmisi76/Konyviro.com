# Teljes Gemini 3 Pro váltás + kódszintű minőségvédelmek

## Cél

Minden szöveg-generáló AI hívás váltson `google/gemini-3-pro-preview`-ra (kivéve a kép-modellek, amik már a megfelelő pro image modellt használják). Emellett bevezetjük a kódszintű védelmeket, amik a klisé-ismétlés, név-keverés és „feltámadó halott" típusú hibákat modelltől függetlenül megfogják.

## Várható eredmény

- Strukturális hibák (Ahogy atya, Camille Lef, Berg háromféle foglalkozás): **megszűnnek** (Pro intelligencia + kódvédelem)
- Klisé-ismétlés („nyaki ütőerén megrebbent a bőr" 29×): **megszűnik** (bigram-tracker)
- Feltámadó halott (Lars): **megszűnik** (status-lock)
- Csomag-árrés: HOBBI ~76%, PROFI ~73% (worst case), realisztikus ~84-85%

## 1. Központi modell-konfiguráció

### Új modul: `supabase/functions/_shared/ai-settings.ts` bővítés

A meglévő `getAISettings()` mellé adunk egy `getDefaultModel()` és `getModelForTask(task)` függvényt:

```ts
export type AITask =
  | "scene"            // jelenetírás
  | "structural"       // story, outline, karakter
  | "lector"           // auto-lektor, refine
  | "quality"          // quality-check, audit
  | "fast"             // chapter-recap, summary, voice
  | "vision";          // image analysis

export async function getModelForTask(task: AITask): Promise<string> { ... }
```

A függvény a `system_settings` táblából olvas (pl. `ai_model_scene`, `ai_model_structural`, ...), default érték minden taskhoz: **`google/gemini-3-pro-preview`** (kivéve `vision` → `gemini-2.5-flash`, `fast` → `gemini-3-flash-preview` költségoptimalizációért).

### DB migráció: új `system_settings` kulcsok

```sql
INSERT INTO system_settings (key, value, description) VALUES
  ('ai_model_scene', '"google/gemini-3-pro-preview"', 'Jelenet- és fejezetírás modellje'),
  ('ai_model_structural', '"google/gemini-3-pro-preview"', 'Story, outline, karakter generálás'),
  ('ai_model_lector', '"google/gemini-3-pro-preview"', 'Auto-lektor és refine'),
  ('ai_model_quality', '"google/gemini-3-pro-preview"', 'Quality checker, audit'),
  ('ai_model_fast', '"google/gemini-3-flash-preview"', 'Rövid összefoglalók, fast tasks'),
  ('ai_model_vision', '"google/gemini-2.5-flash"', 'Képelemzés')
ON CONFLICT (key) DO NOTHING;
```

## 2. Edge function-ök modell-cseréje

Minden hardcoded `model:` érték `await getModelForTask(...)`-ra cserélődik:

| Edge function | Jelenlegi modell | Új task |
|---|---|---|
| `write-scene` (479, 631) | flash-preview | `scene` → **Pro** |
| `write-section` (778) | flash-preview | `scene` → **Pro** |
| `process-next-scene` (389, 524) | flash-preview | `scene` → **Pro** |
| `generate-story` (501) | flash-preview | `structural` → **Pro** |
| `generate-story-ideas` (257) | flash-preview | `structural` → **Pro** |
| `generate-chapter-outline` (226) | flash-preview | `structural` → **Pro** |
| `generate-detailed-outline` (158) | flash-preview | `structural` → **Pro** |
| `generate-section-outline` (195) | flash-preview | `structural` → **Pro** |
| `auto-lector` (163) | flash-preview | `lector` → **Pro** |
| `refine-chapter` (155) | flash-preview | `lector` → **Pro** |
| `audit-name-consistency` (227) | gemini-2.5-flash | `quality` → **Pro** |
| `check-series-consistency` | flash-preview | `quality` → **Pro** |
| `fact-check` (34) | flash-preview | `quality` → **Pro** |
| `book-coach` (173) | flash-preview | `structural` → **Pro** |
| `generate-storybook` (182) | flash-preview | `structural` → **Pro** |
| `ai-continue-text` (139) | gemini-2.5-pro | `scene` → **Pro** |
| `suggest-plot-twists` (139) | gemini-2.5-pro | `structural` → **Pro** |
| `analyze-raw-sources` (173) | gemini-2.5-pro | `structural` → **Pro** |
| `chapter-recap` (141) | gemini-2.5-flash | `fast` → marad Flash (csak rövid összefoglaló) |
| `generate-chapter-summary` (91) | flash-preview | `fast` → marad Flash |
| `generate-character-voice` (53) | flash-preview | `fast` → marad Flash |
| `analyze-writing-style` (114) | flash-preview | `fast` → marad Flash |
| `analyze-character-photo` (60, 151) | gemini-2.5-flash | `vision` → marad Flash |
| `generate-cover` / `edit-cover-inpainting` | image-preview | nem érintett |
| `generate-storybook-illustration` | image | nem érintett |

## 3. Kódszintű minőségvédelmek

### 3.1 Karakternév-validátor (`_shared/name-validator.ts` – új)

- **Magyar funkciószó-feketelista**: `ahogy, csak, pedig, akár, hiszen, viszont, ugyan, bárcsak, talán, mégis, illetve, miközben, ahogyan, mintha, ámbár, jóllehet, akármeddig` – ha ezek bármelyike próbál tulajdonnévvé válni → **STOP, regenerálás**.
- **Megszólítás-konstrukció**: regex `\b([A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+)\s+(atya|néni|bácsi|úr|asszony|kisasszony|mester|főnök|főnyomozó)\b` után ellenőrzi, hogy az `[A-ZÁÉÍÓÖŐÚÜŰ]...` egyezik-e a `characters` táblával vagy a `recurring_names`-szel; ha nem, és funkciószó → flag + regenerálás kérés.
- Beépítés: `write-scene` és `process-next-scene` post-write fázisában a `validateAndFixCharacterNames` mellé.

### 3.2 Karakter-státusz lock (`characters.status` mező)

DB migráció:

```sql
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'alive' CHECK (status IN ('alive', 'dead', 'unknown')),
  ADD COLUMN IF NOT EXISTS death_chapter INTEGER,
  ADD COLUMN IF NOT EXISTS death_scene_id UUID;
```

A `prompt-builder.ts`-ben új `buildCharacterStatusLock()` függvény, ami minden halott karakterre kötelező instrukciót illeszt a system promptba:

> KRITIKUS: [Név] a [X]. fejezetben meghalt. NE jelenjen meg élő szereplőként! Ha visszatérést igényel a cselekmény, használj kísértetet/álmot/visszaemlékezést és JELÖLD egyértelműen.

Új edge function: `validate-character-status` – minden scene után 1 kis Flash hívás eldönti, hogy a jelenetben volt-e karakterhalál; ha igen, frissíti a `characters.status`-t és `death_chapter`-t.

### 3.3 Karakter-foglalkozás lock

A `characters` táblában már van `role` mező. Új post-scene ellenőrzés: regex-eljük a `[Név] (a|az) (polgármester|rendőr|tanító|orvos|ügyvéd|...)` mintát. Ha ugyanaz a név két különböző foglalkozással jelenik meg → flag a `quality_issues` táblába + automatikus refine pass.

### 3.4 Bigram-klisé tracker (`_shared/bigram-cliche-tracker.ts` – új)

A meglévő `cliche-tracker.ts` 13 előre definiált kifejezést kezel. Az új modul **dinamikusan** számolja a `[testrész]+[ige]` 4-grammokat:

- **Testrész szótár**: nyak, mellkas, gyomor, torok, halánték, tarkó, kéz, ujj, láb, térd, váll, hát, fej, szem, száj, ajak, fül, tüdő, bőr, vér
- **Ige szótár**: megrebben, kifeszül, összeszorul, lüktet, dübörög, elgyengül, belesüpped, megreszket, kiszárad, görcsöl, megremeg, megfeszül, elsápad, elpirul, izzad, fagy

Algoritmus:
1. Minden új scene után tokenizáljuk a szöveget.
2. Megkeressük a `[testrész szó (~5 token ablak)] [ige]` mintákat.
3. Eltároljuk a `projects.bigram_counts` JSONB mezőben (új DB oszlop).
4. Ha egy bigramm > 4 a könyvben → a következő scene system promptjába: **"TILOS bigramm: [X]. Eddig [N]× szerepelt. Találj ki teljesen más testi reakciót."**
5. Ha egy bigramm > 6 → automatikus regenerálás (mint a meglévő `clicheOverflow` esetén).

DB migráció:

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS bigram_counts JSONB DEFAULT '{}'::jsonb;
```

### 3.5 Speciális karakter (Unicode) megőrzés a fejezetcímekben

A `generate-chapter-outline` és `generate-section-outline` system promptjához:

> A karakterneveket TELJES UTF-8 formában add vissza (ékezetek, è, é, à, ô, ñ stb. mind kötelező). A nevek SOHA ne legyenek csonkítva. Ha a karakter teljes neve "Camille Lefèvre", akkor a fejezetcímben is így szerepeljen.

Plusz post-process ellenőrzés: a generált fejezetcímekben szereplő szóköz-elválasztott szavakat összevetjük a `characters` tábla neveivel; ha egy cím-szó egy karakternév prefixe (Levenshtein < 3, és a karakternév hosszabb), automatikusan kicseréljük a teljes névre.

## 4. Admin UI bővítés

`src/pages/admin/AdminAISettings.tsx`:

- **6 új dropdown** task-onként (scene, structural, lector, quality, fast, vision) — admin override-olhatja az alapértelmezést.
- **Költség-becslő widget**: az utolsó 30 nap `user_usage` adatai alapján mutatja, mennyibe kerülne a teljes generálás Pro modellel vs Flash-sel (becsült $).
- **Per-user override** opció (jövőbeli, nem most): pl. egy user-nek Claude.

`src/hooks/useAIModel.ts` bővítése: már nem egy default modell, hanem 6 task-modell.

## 5. Bevezetési sorrend

1. **DB migrációk** (system_settings kulcsok, characters.status, characters.death_chapter, projects.bigram_counts)
2. **Shared modulok** (`_shared/ai-settings.ts` bővítés, `_shared/name-validator.ts`, `_shared/bigram-cliche-tracker.ts`)
3. **Prompt-builder** bővítés (status-lock, foglalkozás-lock, Unicode megőrzés)
4. **Edge function-ök modell-cseréje** (mind 28 érintett függvény, batch deploy)
5. **`validate-character-status`** új edge function
6. **Admin UI** bővítés
7. Memory frissítés: új AI-stratégia memória bejegyzés

## 6. Költség-monitoring

Új admin widget már a bevezetés előtt mutatni fogja az utolsó 7 nap várható költségét Pro modellel. Ha valaki látja, hogy egy power-user 50+ könyvet ír egy hónapban, manuálisan tudja át-állítani Flash-re egy meglévő admin setting-en keresztül.

## Érintett fájlok összesítve

**Új fájlok (4):**
- `supabase/functions/_shared/name-validator.ts`
- `supabase/functions/_shared/bigram-cliche-tracker.ts`
- `supabase/functions/validate-character-status/index.ts`
- DB migráció (1 SQL fájl)

**Módosított fájlok (~32):**
- `supabase/functions/_shared/ai-settings.ts` (modell-task mapping)
- `supabase/functions/_shared/prompt-builder.ts` (status + foglalkozás lock)
- 28 edge function modell-cseréje (lásd táblázat)
- `src/pages/admin/AdminAISettings.tsx`
- `src/hooks/useAIModel.ts`

## Mit kérdezek vissza implementáció előtt

1. Akarod-e a **Flash fallback retry**-t? Ha a Pro modell rate-limitet kap (429), automatikusan próbálja meg Flash-en, hogy a felhasználó ne ragadjon le? (Ajánlott igen — a Pro kvóta alacsonyabb, a Flash bevágódik mentőcsónaknak.)
2. A **`fast` task** (chapter-recap, voice, summary, style-elemzés) maradhat-e Flash-en? Ezek nem érintik a könyv prózáját, csak metaadatot generálnak — Pro itt feleslegesen drága lenne. (Ajánlott: maradjon Flash.)
3. Akarod-e, hogy a **bigram-tracker küszöbei admin-állíthatók** legyenek (jelenleg 4 = warning, 6 = retry)? Vagy hardcoded?
