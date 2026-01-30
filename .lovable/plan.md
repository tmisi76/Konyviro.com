

# Lektorálás Teljes Törlése

A lektorálás funkció teljes eltávolítása az alkalmazásból, beleértve az összes felhasználói felületet, hook-ot, edge function-t és adatbázis táblát.

## Törlendő Komponensek

### 1. Frontend Fájlok - Teljes Törlés

| Fájl | Típus |
|------|-------|
| `src/components/proofreading/ProofreadingTab.tsx` | Teljes komponens |
| `src/hooks/useProofreading.ts` | Hook |
| `src/hooks/useChapterProofreading.ts` | Hook |
| `src/hooks/useActiveProofreadings.ts` | Hook |
| `src/components/dashboard/ProofreadingStatusCard.tsx` | Komponens |

### 2. Frontend Módosítások

| Fájl | Változás |
|------|----------|
| `src/pages/ProjectEditor.tsx` | "Lektor" tab és ProofreadingTab import eltávolítása |
| `src/pages/Dashboard.tsx` | Aktív lektorálások szekciók és useActiveProofreadings törlése |
| `src/components/editor/ChapterSidebar.tsx` | "Fejezet lektorálása" context menu elem és a lektorálási dialog törlése |
| `src/hooks/useEditorState.ts` | "proofreading" törlése a ViewMode típusból |
| `src/constants/credits.ts` | Lektorálási konstansok és calculateProofreadingCredits függvény törlése |
| `src/hooks/useAIModel.ts` | proofreadingModel és proofreadingModelName eltávolítása |
| `src/pages/admin/AdminAISettings.tsx` | "Lektorálási Modell" szekció törlése |

### 3. Edge Functions - Teljes Törlés

| Funkció | Leírás |
|---------|--------|
| `supabase/functions/start-proofreading/` | Teljes lektorálás indítása |
| `supabase/functions/process-proofreading/` | Háttérben futó lektorálási feldolgozó |
| `supabase/functions/proofread-chapter/` | Streaming fejezet lektorálás |
| `supabase/functions/admin-test-proofreading/` | Admin teszt lektorálás |

### 4. Adatbázis Változások

A `proofreading_orders` tábla törlése SQL migrációval:

```sql
DROP TABLE IF EXISTS public.proofreading_orders;
```

## Részletes Változások

### ProjectEditor.tsx
- Import törlése: `ProofreadingTab`
- ViewMode típusból "proofreading" eltávolítása
- Tab törlése: `<TabsTrigger value="proofreading">` és a hozzá tartozó panel
- Ha `viewMode === "proofreading"` ág törlése

### Dashboard.tsx
- Import törlése: `ProofreadingStatusCard`, `useActiveProofreadings`
- `const { activeProofreadings } = useActiveProofreadings();` törlése
- Mindkét "Aktív lektorálások" szekció törlése (mobil és desktop)

### ChapterSidebar.tsx
- `useChapterProofreading` import és hook hívás törlése
- `calculateChapterCredits` import törlése
- Lektorálási state változók törlése: `proofreadingChapter`, `isRefreshing`
- `handleProofreadingComplete`, `handleProofreadChapter`, `handleConfirmProofreading`, `handleCloseProofreadingDialog`, `getCreditsInfo` függvények törlése
- "Fejezet lektorálása" ContextMenuItem törlése
- Proofreading Dialog (teljes `<Dialog>` blokk) törlése

### useEditorState.ts
- ViewMode típusból "proofreading" eltávolítása

### useAIModel.ts
- `proofreadingModel` és `proofreadingModelName` mezők eltávolítása az interfészből és a visszatérési értékből

### credits.ts
- `PROOFREADING_CREDIT_MULTIPLIER`, `PROOFREADING_MIN_CREDITS` konstansok törlése
- `calculateProofreadingCredits` függvény törlése

### AdminAISettings.tsx
- `proofreading_model` eltávolítása az AISettings interfészből
- "Lektorálási Modell" Card komponens törlése

## Sorrend

1. Adatbázis migráció: `proofreading_orders` tábla törlése
2. Edge function-ök törlése (4 db)
3. Frontend hook-ok és komponensek törlése (5 fájl)
4. Frontend fájlok módosítása (7 fájl)

## Megjegyzések

- A kreditekhez nem nyúlunk (nincs refund)
- A jelenleg "processing" státuszú lektorálás (1 db) a tábla törlésekor elveszik
- A types.ts fájlban a Supabase típusok automatikusan frissülnek a migráció után

