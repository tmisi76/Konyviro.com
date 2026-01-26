
# Terv: Projekt Betöltési Oldal Vicces Üzenetekkel

## Összefoglaló
Amikor a felhasználó egy projektre kattint, 3 másodpercig egy egyedi betöltési oldal jelenik meg:
- Animált progress bar (0% → 100%)
- Véletlenszerűen váltakozó vicces üzenetek
- KönyvÍró logóval

## Működés

```text
┌──────────────────────────────────────────────────┐
│                                                  │
│              [K] KönyvÍró                        │
│                                                  │
│     ════════════════════════════════════         │
│     ████████████████░░░░░░░░░░░░░░░░░  67%       │
│     ════════════════════════════════════         │
│                                                  │
│   "Éppen az utolsó szavakat írom..."             │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Vicces Üzenetek Listája

- "Éppen az utolsó szavakat írom..."
- "Pár pillanat és mutatok egy bestsellert..."
- "Türelem bestsellert terem..."
- "A múzsa épp ihletért megy..."
- "Kávét főzök a karaktereknek..."
- "Fejezetek rendezése folyamatban..."
- "Az író még a tollát keresi..."
- "Kreatív energia töltése..."
- "A történet szálait bogozom..."
- "Még gyorsan átolvasom a végét..."

## Technikai Megvalósítás

### 1. Új Komponens: ProjectLoadingScreen

**Fájl:** `src/components/loading/ProjectLoadingScreen.tsx`

```typescript
// Fő tulajdonságok:
- 3 másodperces időzítő (3000ms)
- Progress bar 0% → 100% animáció
- Üzenetváltás 600ms-onként (kb. 5 üzenet jelenik meg)
- onComplete callback a navigációhoz
```

### 2. Dashboard Módosítás

**Fájl:** `src/pages/Dashboard.tsx`

Változások:
- Új state: `loadingProjectId` (string | null)
- `handleProjectOpen` módosítása: loading screen megjelenítése navigáció helyett
- A loading screen befejezése után történik a navigáció

```typescript
// Új flow:
1. Felhasználó kattint projektre
2. setLoadingProjectId(project.id) - loading screen megjelenik
3. 3 másodperc múlva onComplete callback
4. navigate(`/project/${id}`) - valódi navigáció
5. setLoadingProjectId(null) - cleanup
```

### 3. Animációk

A progress bar lineárisan halad 0%-ról 100%-ra 3 másodperc alatt.
Az üzenetek fade-in/fade-out effekttel váltakoznak.

## Érintett Fájlok

| Fájl | Művelet |
|------|---------|
| `src/components/loading/ProjectLoadingScreen.tsx` | Új komponens |
| `src/pages/Dashboard.tsx` | Loading state és logika hozzáadása |

## UX Részletek

- A loading screen teljes képernyős overlay
- Sötét háttér a mögöttes tartalom felett
- A progress bar folyamatosan és simán animálódik
- Az üzenetek véletlenszerű sorrendben jelennek meg (nincs ismétlés egymás után)
- A projekt címe is megjelenhet opcionálisan
