## Probléma

A wizard végén (Step7AutoWrite) megjelenik az **„Automatikus írás indítása"** gomb, és ha a felhasználó nem kattint rá, hanem kilép a Dashboard-ra, a projekt létre van hozva — de a Dashboard **ProjectCard-ján nem jelenik meg** a gomb, így nem tudja onnan újraindítani.

## Ok

A wizard a projektet `writing_status: "draft"` státusszal hozza létre (`useBookWizard.ts:263, 534`). A Dashboard `ProjectCard.tsx` viszont csak akkor mutatja az indító gombot, ha:

```ts
const isIdle = !liveStatus || liveStatus === "idle";   // "draft" → false
{isIdle && canStart && <Button>Automatikus írás indítása</Button>}
```

A `canStart` (a `useBackgroundWriter` hookból) szintén csak `idle | failed | in_progress` esetén `true`, tehát a `draft` mindkét feltételen megbukik → a gomb sosem jelenik meg.

Emellett a wizard wordcount-jából / képi sorrendjéből látszik, hogy a "Folyamatban lévő írások" szekció filterében (`Dashboard.tsx:118-127`) sincs benne a `'draft'` státusz, tehát a `WritingStatusCard` sem jelenik meg.

## Javítás

### 1. `src/components/dashboard/ProjectCard.tsx`
A `'draft'` státuszt is kezeljük idle-ként:

```ts
const isIdle = !liveStatus || liveStatus === "idle" || liveStatus === "draft";
```

### 2. `src/hooks/useBackgroundWriter.ts`
A `canStart` engedje a `'draft'` státuszt is:

```ts
const canStart = ['idle', 'draft', 'failed', 'in_progress'].includes(progress.status);
```

(Ugyanígy a `WritingStatus` típushoz `'draft'` már létezik, nem kell módosítani.)

### 3. (Opcionális) `src/pages/Dashboard.tsx`
Hogy a felhasználó a „Folyamatban lévő írások" szekcióban is lássa a befejezetlen wizardot — **NE** vegyük fel ide a `'draft'`-ot, mert az nem aktív írás. Helyette a ProjectCard-on megjelenő „Automatikus írás indítása" gomb a természetes hely.

## Eredmény

A Dashboardon minden olyan projektnél, ahol a wizard befejeződött, de az írás még nem indult el (`writing_status = 'draft'`), megjelenik az **„Automatikus írás indítása"** gomb — ugyanaz, ami a wizard végén volt.

## Érintett fájlok
- `src/components/dashboard/ProjectCard.tsx` (1 sor)
- `src/hooks/useBackgroundWriter.ts` (1 sor)