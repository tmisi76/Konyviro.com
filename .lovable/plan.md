

# Mesekönyv generálás javítása: várakozás, kredit és képformátum

## Problémák összefoglalása

A mesekönyv készítő jelenleg három fő hibával küzd:
1. A képgenerálás nem fut le / nem várja meg a végét
2. Nincs előzetes kredit becslés és utólagos levonás
3. Bizonyos képformátumok (pl. JP2, HEIC) nem jelennek meg a böngészőben

---

## 1. Kredit rendszer bevezetése

### Kredit költségek kiszámítása

| Művelet | Költség |
|---------|---------|
| Szöveggenerálás | Ténylegesen generált szavak száma |
| Képgenerálás | 500 szó-kredit / oldal |

### Előzetes becslés megjelenítése

A generálás előtt (5. lépés - StorybookStoryStep után) megjelenítjük a becsült költséget:

```text
Becsült költség:
- Szöveg: ~800 szó (16 oldal × ~50 szó)
- Képek: 8,000 szó-kredit (16 kép × 500)
- Összesen: ~8,800 szó-kredit
```

### Változtatások

**Fájl: `src/components/storybook/steps/StorybookGenerateStep.tsx`**
- Hozzáadás: Becsült kredit költség panel a generálás előtt
- Hozzáadás: Kredit ellenőrzés a `handleStartGeneration` előtt
- Frissítés: Végső kredit felhasználás megjelenítése az elkészülés után

**Fájl: `supabase/functions/generate-storybook/index.ts`**
- Válaszban visszaadjuk a ténylegesen generált szavak számát (`words_generated`)
- A levonás a ténylegesen generált szavak alapján történik (ez már működik, de frissítjük)

**Fájl: `supabase/functions/generate-storybook-illustration/index.ts`**
- Már 500 kredit / képet von le - ez marad

---

## 2. Képgenerálás várakozás javítása

### Jelenlegi probléma

A `StorybookGenerateStep` komponensben a képgenerálási ciklus nem várja meg ténylegesen a képeket:

```typescript
// Jelenlegi (hibás) kód:
for (let i = 0; i < pagesCount; i++) {
  setCurrentIllustration(i + 1);
  setProgress(50 + ((i + 1) / pagesCount) * 45);
  await new Promise(resolve => setTimeout(resolve, 500)); // Csak várakozás, nem generálás!
}
const illustrationsSuccess = await onGenerateIllustrations(); // Ez később fut
```

### Javítás

A `StorybookGenerateStep` komponensben:
1. Azonnal hívjuk a `generateAllIllustrations`-t
2. A hook-ban minden kép generálása után callback-kel frissítjük a progresst
3. Valódi várakozás minden képre

**Fájl: `src/hooks/useStorybookWizard.ts`**
- A `generateAllIllustrations` függvényt módosítjuk, hogy egy `onProgress` callback-et fogadjon
- Ez a callback minden képgenerálás után meghívódik a progresszel

**Fájl: `src/components/storybook/steps/StorybookGenerateStep.tsx`**
- A fázislogikát frissítjük: a képgenerálás a story után azonnal fut
- Progress frissítése valós időben

**Fájl: `src/components/storybook/StorybookWizard.tsx`**
- A `generateAllIllustrations`-t átírjuk, hogy progress callback-et kapjon

---

## 3. Képformátum ellenőrzés

### Támogatott formátumok

Böngészők által széles körben támogatott formátumok:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)

### Nem támogatott formátumok

- JPEG 2000 (.jp2, .j2k)
- HEIC/HEIF (.heic, .heif)
- AVIF (.avif) - részleges támogatás

### Implementáció

**Fájl: `src/components/storybook/steps/StorybookCharactersStep.tsx`**
- Módosítjuk a dropzone `accept` listáját, hogy csak támogatott formátumokat fogadjon
- Hibaüzenet hozzáadása, ha nem támogatott formátumot próbál feltölteni

```text
accept: {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
}
```

- Új hibaüzenet: "Ez a képformátum nem támogatott. Kérlek használj JPG, PNG vagy WebP formátumot."

**Fájl: `src/hooks/useStorybookWizard.ts`**
- A `uploadCharacterPhoto` függvényben ellenőrizzük a fájl MIME típusát
- Hibaüzenet dobás, ha nem támogatott

---

## 4. Részletes kódváltoztatások

### 4.1 StorybookGenerateStep.tsx frissítése

Az alábbi változtatásokat végezzük:

1. **Props bővítése**: Új prop a kredit ellenőrzéshez és progress callback-hez
2. **Kredit becslés panel**: Új UI elem a generálás előtt
3. **Valós képgenerálás várakozás**: A képgenerálási fázisban valódi várakozás

### 4.2 useStorybookWizard.ts frissítése

1. **generateAllIllustrations**: Progress callback hozzáadása
2. **Kredit ellenőrzés**: Új függvény a generálás előtti ellenőrzéshez

### 4.3 StorybookCharactersStep.tsx frissítése

1. **Accept lista korlátozása**: Csak támogatott formátumok
2. **Hibaüzenet**: Felhasználóbarát üzenet nem támogatott formátumnál

---

## 5. Folyamatábra

```text
┌─────────────────────────────────────┐
│ 5. lépés: Történet részletek        │
│ "Mese generálása" gomb              │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 6. lépés: Generálás                 │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Becsült költség:                │ │
│ │ ~8,800 szó-kredit               │ │
│ │ (Elérhető: 45,000)              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Generálás indítása] gomb           │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Szöveg generálás fázis              │
│ Progress: 0% → 50%                  │
│ API: generate-storybook             │
│ Kredit: ténylegesen írt szavak      │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Képgenerálás fázis                  │
│ Progress: 50% → 100%                │
│ EGYENKÉNT, minden oldalra:          │
│   API: generate-storybook-illustration
│   Kredit: 500 / kép                 │
│   Várakozás a válaszra              │
│   Progress frissítés                │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Elkészült!                          │
│ Felhasznált kredit: X szó           │
│ [Mesekönyv megtekintése] gomb       │
└─────────────────────────────────────┘
```

---

## 6. Módosítandó fájlok összefoglalása

| Fájl | Változtatás típusa |
|------|-------------------|
| `src/components/storybook/steps/StorybookGenerateStep.tsx` | Kredit panel, valós várakozás logika |
| `src/hooks/useStorybookWizard.ts` | Progress callback, kredit ellenőrzés |
| `src/components/storybook/steps/StorybookCharactersStep.tsx` | Formátum korlátozás |
| `src/components/storybook/StorybookWizard.tsx` | Props továbbítás |
| `supabase/functions/generate-storybook/index.ts` | Szó-szám visszaadása |
| `src/types/storybook.ts` | Típusok bővítése (kreditekhez) |

---

## 7. Fontos megjegyzések

- A kredit levonás már működik a backend oldalon - csak a frontend várakozást és a becslést kell hozzáadni
- A képgenerálás 500 szó-kredit / kép - ez már implementálva van
- A formátum ellenőrzés a feltöltésnél történik, nem konvertálunk
- Ha nincs elég kredit, egyértelmű hibaüzenetet adunk a generálás előtt

