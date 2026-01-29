
# Terv: Történet leírás mező hozzáadása az Adatok lépéshez

## Összefoglaló
Hozzáadunk egy nagyobb szövegmezőt (textarea) az "Alapadatok megadása" wizard lépéshez, ahol a felhasználó részletesen leírhatja a könyve történetét. Ez az adat lesz a legfontosabb (80%) input az AI ötletgenerálásnál.

## Változtatások

### 1. Típus definíció bővítése
**Fájl:** `src/types/wizard.ts`

Új mező a WizardData interface-hez:
- `storyDescription: string` - a könyv történetének részletes leírása

### 2. Wizard hook frissítése
**Fájl:** `src/hooks/useBookWizard.ts`

- Kezdeti állapot: `storyDescription: ""`
- `setBasicInfo` függvény: fogadja és kezeli az új mezőt
- `reset` függvény: visszaállítja üresre
- `saveProject`: mentse az adatbázisba (optional - ha szükséges)

### 3. Adatok lépés UI frissítése
**Fájl:** `src/components/wizard/steps/Step3BasicInfo.tsx`

Új textarea mező hozzáadása a "Könyv címe" alatt:

```text
┌─────────────────────────────────────────┐
│ Könyv címe (opcionális)                 │
│ [________________________]              │
│                                         │
│ Történet röviden * (FONTOS!)            │
│ ┌─────────────────────────────────────┐ │
│ │ Nagy textarea (min-h-[150px])       │ │
│ │ Placeholder: "Írd le részletesen,   │ │
│ │ miről szóljon a könyved. Ez 80%-ban │ │
│ │ befolyásolja a generált ötleteket." │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Célközönség                             │
│ ...                                     │
└─────────────────────────────────────────┘
```

Props és state frissítése:
- `initialData.storyDescription` prop hozzáadása
- `storyDescription` local state
- `onSubmit` callback-ba bekerül az új mező

### 4. Wizard komponens frissítése
**Fájl:** `src/components/wizard/BookCreationWizard.tsx`

- Step3BasicInfo-nak átadni: `storyDescription: data.storyDescription`
- Step4StoryIdeas-nak átadni: `storyDescription` prop

### 5. Ötlet generáló komponens frissítése
**Fájl:** `src/components/wizard/steps/Step4StoryIdeas.tsx`

- Új prop: `storyDescription: string`
- Edge function hívásba bekerül: `storyDescription` paraméter

### 6. Edge Function prompt frissítése
**Fájl:** `supabase/functions/generate-story-ideas/index.ts`

A prompt-ba bekerül a storyDescription mint **legfontosabb** input:

```typescript
const storyDescriptionSection = storyDescription
  ? `\n\n🎯 A SZERZŐ SAJÁT TÖRTÉNETE/ÖTLETE (KIEMELT FONTOSSÁGÚ - 80%):
"${storyDescription}"

Az ötleteknek KÖTELEZŐEN ezen a történeten/ötleten kell alapulniuk! 
Ne generálj teljesen eltérő témákat!`
  : "";
```

## Technikai részletek

### Interface változások
```typescript
// types/wizard.ts
interface WizardData {
  // ... meglévő mezők
  storyDescription: string;  // ÚJ
}
```

### UI specifikus
- Textarea: `min-h-[150px]` vagy nagyobb
- Label: félkövér "Történet röviden" + csillag (fontos jelzés)
- Placeholder: részletes magyar nyelvű útmutató
- Opcionálisan: karakter számláló vagy "legalább X karakter ajánlott" jelzés

### Edge Function prompt prioritás
A storyDescription mező **első helyen** kerül a prompt-ba, kiemelve hogy ez a legfontosabb input, és az AI-nak erre kell alapoznia az ötleteket.

## Fájlok listája
1. `src/types/wizard.ts` - típus bővítés
2. `src/hooks/useBookWizard.ts` - state kezelés
3. `src/components/wizard/steps/Step3BasicInfo.tsx` - UI
4. `src/components/wizard/BookCreationWizard.tsx` - prop átadás
5. `src/components/wizard/steps/Step4StoryIdeas.tsx` - API hívás
6. `supabase/functions/generate-story-ideas/index.ts` - AI prompt
