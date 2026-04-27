## Cél

Amikor a felhasználó **Oknyomozó (investigative)** szakkönyvet ír — különösen **Politika/Közélet** vagy **Bűnügy/True Crime** alkategóriában —, a könyv **valós, megtörtént eseményeken** alapuljon (elnök bukása, sorozatgyilkos története, korrupciós botrány stb.), ne hallucinált fikción. Ehhez:

1. Egy **új extra mező** a wizardban, ahol a felhasználó megadhatja a konkrét ügyet/személyt/eseményt és bármi extra utasítást.
2. Egy **valós kutatási réteg** (web search), amely tényeket, dátumokat, neveket, idézeteket gyűjt egy edge functionnel.
3. A kutatási eredmények **bekerülnek a story idea, az outline és a fejezetírás promptjaiba** kötelező hivatkozási forrásként, szigorú anti-hallucination szabályokkal.

## Miért Perplexity (nem natív Gemini grounding)

A Lovable AI Gateway a Gemini modelleket az OpenAI-kompatibilis chat completions formátumban szolgálja ki — **a Google natív `googleSearch` grounding tool nem érhető el** ezen a felületen. Ezért valós idejű web-kutatáshoz a **Perplexity `sonar` / `sonar-reasoning` modellt** használjuk (külön connector), amely visszaad citation URL-eket is. Ez biztosítja a tényalapú, ellenőrizhető forrásokat.

> A Perplexity connector csatlakoztatása szükséges (egyszeri lépés a felhasználó részéről). Jelzem neki és felajánlom a connect flow-t a megvalósítás elején.

## Felhasználói folyamat

```text
Wizard → Step 5 (Investigative form)
  ├─ Meglévő mezők (subject, central question, scope, ...)
  └─ ÚJ: "Konkrét valós ügy / extra kutatási instrukció" textarea
         (Pl. "Watergate-botrány", "Ted Bundy", "Postabank-ügy")
              ↓
Story Ideas generálás
  ├─ research-real-case edge function → Perplexity Sonar
  │     (tényeket, dátumokat, szereplőket, idézeteket, forrás-URL-eket gyűjt)
  └─ generate-story-ideas megkapja a kutatási csomagot → tényalapú ötletek
              ↓
Detailed Outline + Fejezet írás
  └─ Minden prompt megkapja a research dossier-t
        + szigorú szabály: "csak a dossier-ben szereplő tényeket használd"
```

## Mit fejlesztünk

### 1. Wizard – új mező

**`src/types/wizard.ts`** – `BookTypeSpecificData` interfész bővítése:
- `realCaseReference?: string` — a felhasználó megnevezi a konkrét ügyet/személyt
- `extraResearchInstructions?: string` — extra utasítás a kutatáshoz (pl. "fókuszálj a 2008–2012 közti időszakra")

**`src/components/wizard/steps/Step5BookTypeData.tsx`** – `renderInvestigativeForm()` bővítése:
- Új kiemelt szekció: "🔍 Valós ügy + AI kutatás"
- `Textarea`: "Melyik konkrét, valós ügy, személy vagy esemény legyen a könyv alapja?"
  - placeholder: pl. "Postabank-botrány", "Ted Bundy sorozatgyilkos", "Nixon és a Watergate"
  - segítő szöveg: "Az AI valódi forrásokból fog kutatni — csak megtörtént események kerülnek bele"
- `Textarea`: "Extra kutatási instrukciók (opcionális)"

### 2. Új Edge Function: `research-real-case`

**`supabase/functions/research-real-case/index.ts`** (új):
- Bemenet: `{ subject, realCaseReference, extraInstructions, subcategory, language: "hu" }`
- Hívja a **Perplexity `sonar-reasoning`** modellt (connector gateway-en keresztül NEM — Perplexity direkt API kulccsal, mert nem gateway-es connector)
- A prompt: "Gyűjts össze megtörtént, ellenőrizhető tényeket [X]-ről: kulcsszereplők, dátumok, helyszínek, fordulópontok, dokumentált idézetek, jogi következmények, források."
- Strukturált JSON kimenet (Perplexity `response_format: json_schema`):
  ```json
  {
    "caseTitle": "...",
    "verifiedSummary": "...",
    "keyPlayers": [{ "name", "role", "verifiedFacts" }],
    "timeline": [{ "date", "event", "source" }],
    "documentedQuotes": [{ "quote", "speaker", "source" }],
    "consequences": "...",
    "sources": ["url1", "url2", ...],
    "uncertainties": "ami nem ellenőrizhető vagy vitatott"
  }
  ```
- Mentés: új `project_research` táblába (cache, hogy ne kelljen újrafutni minden lépésnél). RLS: csak a projekt tulajdonosa olvassa.

### 3. Új tábla: `project_research`

```sql
create table public.project_research (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  case_reference text not null,
  research_data jsonb not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);
-- RLS: SELECT/INSERT csak a projekt tulajdonosa (auth.uid() = projects.user_id)
```

### 4. Promptok bővítése – kötelező tényhasználat

**`supabase/functions/generate-story-ideas/index.ts`** (investigative ágban):
- Ha van `realCaseReference` → meghívja a `research-real-case` functiont
- A `bookTypeContext`-be beilleszti: `## VALÓS KUTATÁSI DOSSIER (KÖTELEZŐ FORRÁS):` + JSON
- Új szabály a prompthoz:
  > "TILOS kitalált eseményeket, neveket vagy dátumokat használni. KIZÁRÓLAG a kutatási dossier-ben szereplő tényekre építhetsz. Ha valami nincs a dossier-ben, ne találd ki — hagyd ki."

**`supabase/functions/generate-detailed-outline/index.ts`** + **`generate-chapter-outline`**:
- Ha investigative és van research → research_data injection a promptba
- Fejezetcímek és events csak valós dátumokhoz/eseményekhez kötődhetnek

**`supabase/functions/write-section/index.ts`** (és/vagy `write-scene`):
- A research dossier bekerül a system promptba
- Anti-hallucination guard: "Ha nincs forrásod egy konkrét állításra, írd le bizonytalanságként ('A források szerint...', 'Nem teljesen tisztázott...') — SOSE találj ki neveket, dátumokat, helyszíneket, idézeteket."
- A `_shared/prompt-builder.ts`-be új helper: `buildInvestigativeResearchBlock(research)`.

### 5. UI visszajelzés

A wizard Step 5 és a story ideas képernyőn:
- Loading state: "🔍 Valós források kutatása folyamatban (Perplexity)..."
- Story idea kártyán "Forrás-alapú" badge + kis link a forrásokra (sources accordion)

## Technikai részletek

- **Perplexity API kulcs**: connector flow-val kérjük be (`standard_connectors--connect` `perplexity`). Ha a felhasználó nem akarja csatlakoztatni, a feature inaktív marad és figyelmeztetést kap.
- **Modell**: `sonar-reasoning` (mély kutatás citation-ökkel). Magyar ügyeknél `search_domain_filter` nélkül, hogy magyar források is bejöjjenek.
- **Cache**: a `project_research` tábla miatt egy ügy csak egyszer kerül lekérdezésre projektenként; a refresh-hez gomb.
- **Költség kontroll**: csak akkor fut, ha (a) genre = `szakkonyv`, (b) `nonfictionBookType = investigative`, (c) `realCaseReference` ki van töltve.
- **Visszafelé kompatibilitás**: a meglévő investigative flow tovább működik, ha a felhasználó nem ad meg `realCaseReference`-et (csak generikus oknyomozó marad).

## Érintett fájlok

Új:
- `supabase/functions/research-real-case/index.ts`
- `supabase/migrations/<ts>_project_research.sql`

Módosítva:
- `src/types/wizard.ts` — 2 új mező
- `src/components/wizard/steps/Step5BookTypeData.tsx` — extra szekció a `renderInvestigativeForm`-ban
- `src/hooks/useStoryGeneration.ts` (vagy ahol a generate-story-ideas hívás történik) — research trigger
- `supabase/functions/generate-story-ideas/index.ts` — research dossier injekció + anti-hallucination szabály
- `supabase/functions/generate-detailed-outline/index.ts` — research injekció
- `supabase/functions/generate-chapter-outline/index.ts` — research injekció
- `supabase/functions/write-section/index.ts` (+ esetleg `write-scene`) — research a system promptba
- `supabase/functions/_shared/prompt-builder.ts` — `buildInvestigativeResearchBlock()` helper

## Megerősítések, mielőtt elkezdem

1. **Perplexity csatlakoztatása**: a megvalósítás első lépése a Perplexity connector csatlakoztatása lesz (egy gomb-nyomás). Ez ad valós, citation-alapú forrásokat.
2. **Költség**: minden investigative projekt 1 darab Perplexity hívást generál a research-hez (cache után 0).
3. Ha a felhasználó NEM ad meg konkrét ügyet, a rendszer figyelmeztet: "Add meg a konkrét ügyet/személyt, hogy valós forrásokból dolgozzunk — különben a könyv általánosabb lesz."

Jóváhagyás után megvalósítom.