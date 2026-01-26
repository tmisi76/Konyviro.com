# Mesekönyv generálás javítása - IMPLEMENTÁLVA ✅

## Végrehajtott változtatások

### 1. ✅ Képformátum korlátozás
- `StorybookCharactersStep.tsx`: Dropzone csak JPG, PNG, WebP formátumokat fogad
- `useStorybookWizard.ts`: Fájl MIME típus ellenőrzés feltöltés előtt
- Egyértelmű hibaüzenet nem támogatott formátumnál

### 2. ✅ Kredit becslés megjelenítése
- `StorybookGenerateStep.tsx`: Kredit panel a generálás előtt
- Szöveg generálás: 3,000 kredit (fix)
- Illusztráció: 500 kredit / oldal
- Összesített becslés és elérhető kredit megjelenítése

### 3. ✅ Képgenerálás várakozás javítása
- `useStorybookWizard.ts`: `generateAllIllustrations` progress callback-kel
- `StorybookGenerateStep.tsx`: Valós idejű progress frissítés képenként
- A generálás megvárja minden kép elkészültét

### 4. ✅ Kredit konstansok
- `src/constants/credits.ts`: STORYBOOK_TEXT_COST, STORYBOOK_ILLUSTRATION_COST

## Módosított fájlok

| Fájl | Változtatás |
|------|-------------|
| `src/components/storybook/steps/StorybookCharactersStep.tsx` | Formátum korlátozás, hibaüzenet |
| `src/components/storybook/steps/StorybookGenerateStep.tsx` | Kredit panel, valós várakozás |
| `src/hooks/useStorybookWizard.ts` | Progress callback, formátum validáció |
| `src/constants/credits.ts` | Storybook költség konstansok |


