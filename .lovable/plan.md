# Multi-select hangnem (Tone) az Adatok lépésben

## Probléma

Az "Adatok" lépésben (`Step3BasicInfo`) jelenleg csak EGY hangnem választható (single-select). A felhasználó több hangulati irányt is szeretne kombinálni (pl. „Drámai + Feszült + Sötét"), és az AI vegye ezeket figyelembe a generáláskor.

## Megoldás áttekintés

A `tone` adatmodellt egyetlen értékről több értékre bővítjük a wizard állapotban, és tárolásnál pontosvesszővel elválasztva mentjük a DB-be (`projects.tone` `string` mező — sémaváltozás NEM kell, kompatibilis marad). A promptok természetes nyelvű felsorolásként kapják meg.

## Részletek

### 1. UI — `src/components/wizard/steps/Step3BasicInfo.tsx`

- `tone` state: `Tone | null` → `Tone[]`.
- Kattintásra toggle (hozzáad / eltávolít a tömbből).
- Kis vizuális visszajelzés: a kiválasztott chipek számláló („3 kiválasztva") + finom hint: „Akár több hangnem is választható".
- `canSubmit`: legalább 1 hangnem.
- Az `onSubmit` `tone` propként az első kiválasztottat adja át vissza (legacy típus-kompatibilitás), DE új propként `tones: Tone[]`-ot is.

### 2. Típus + hook — `src/types/wizard.ts`, `src/hooks/useBookWizard.ts`

- `WizardData`-hoz hozzáadunk: `tones: Tone[]` (a meglévő `tone: Tone | null` marad backward-compat miatt, és mindig az első elemmel egyezik).
- `setBasicInfo` payload: `tones?: Tone[]` mezőt is fogadja, beállítja mindkettőt (`tones` és `tone`).
- `saveProject` és `storyStructure.tone`: a több hangnemet `tones.join("; ")` formátumban mentjük a `projects.tone` oszlopba (string), így a DB séma érintetlen.

### 3. Lefelé adás a többi wizard-stepnek

- A Step4StoryIdeas, Step5StoryDetail props-ját nem változtatjuk: a `tone` prop a kombinált stringet kapja (`"Drámai; Feszült; Sötét"`).
- Így a `generate-story-ideas`, `generate-story` stb. edge functions automatikusan a kombinált felirattal dolgoznak (a promptokban már `Hangnem: ${tone}` szerepel — ez most több is lehet).

### 4. Edge functions kis kiegészítése

- `supabase/functions/generate-story/index.ts`: a `toneNames` map csak egy egyetlen kulcsra fordított emberi nevet ad. Frissítjük úgy, hogy ha a `tone` pontosvesszőt tartalmaz, minden részt külön fordítson, majd magyar felsorolásként adja vissza (pl. „Drámai, Feszült és Sötét").
- A többi edge function a tone-t nyers stringként használja prompt-kontextusban — ott a kombinált string ugyanúgy működik, nem kell módosítani.

## Mit NEM csinálunk

- Nem érintjük a non-fiction altípus-specifikus tone mezőit (`leadershipTone`, `storyTone`, `memoirTone`, `investigationTone`) — azok továbbra is single-select, mert a könyvtípushoz kötött szerkezeti döntések.
- Nem módosítjuk a DB sémát — a `projects.tone` `string` mező marad.
- A meglévő projektek (single tone) változatlanul működnek.

## Érintett fájlok

- `src/components/wizard/steps/Step3BasicInfo.tsx`
- `src/types/wizard.ts`
- `src/hooks/useBookWizard.ts`
- `supabase/functions/generate-story/index.ts` (csak a `toneNames` formázás)
