

## Probléma

Amikor új mesekönyvet kezdesz készíteni, a rendszer betölti a korábbi (félbehagyott) mesekönyv adatait a session storage-ból, ahelyett hogy tiszta lappal indulna.

## Megoldás

Két helyen kell biztosítani, hogy a mesekönyv varázsló mindig tiszta állapottal induljon:

### 1. Dashboard "Új projekt" gomb
**Fájl:** `src/pages/Dashboard.tsx`

A `handleNewProject` függvényben a `book-wizard-data` mellett töröljük a `storybook-wizard-data`-t is:

```typescript
const handleNewProject = () => {
  if (isProjectLimitReached()) {
    setIsUpgradeModalOpen(true);
    return;
  }
  // Clear ALL wizard states to ensure fresh project creation
  sessionStorage.removeItem("book-wizard-data");
  sessionStorage.removeItem("storybook-wizard-data"); // << ÚJ
  navigate("/create-book");
};
```

### 2. StorybookWizard komponens mount
**Fájl:** `src/components/storybook/StorybookWizard.tsx`

A komponens indulásakor explicit módon reseteljük a régi adatokat, ha a felhasználó "frissen" érkezik (nem visszalépés vagy oldal újratöltés):

Új logika a `StorybookWizard` komponensben:
- Ellenőrizzük, hogy volt-e korábban befejezetlen projekt (pl. `data.projectId !== null` vagy `currentStep > 1`)
- Ha "frissen" érkezünk a `/create-storybook` útvonalra, automatikusan reseteljük

Alternatív, egyszerűbb megközelítés:
- A `CreateStorybook.tsx` page komponensben, mielőtt renderelnénk a `StorybookWizard`-ot, töröljük a session storage-ot

**Fájl:** `src/pages/CreateStorybook.tsx`

```typescript
import { useEffect } from "react";
import { StorybookWizard } from "@/components/storybook/StorybookWizard";

export default function CreateStorybook() {
  // Always start fresh when navigating to this page
  useEffect(() => {
    sessionStorage.removeItem("storybook-wizard-data");
  }, []);

  return <StorybookWizard />;
}
```

### 3. BookCreationWizard navigáció
**Fájl:** `src/components/wizard/BookCreationWizard.tsx`

Amikor a felhasználó a "mesekonyv" műfajt választja, töröljük a session storage-ot a navigáció előtt:

```typescript
const handleGenreSelect = (genre: "szakkonyv" | "fiction" | "mesekonyv") => {
  if (genre === "mesekonyv") {
    sessionStorage.removeItem("storybook-wizard-data"); // << ÚJ
    navigate("/create-storybook");
    return;
  }
  // ...
};
```

## Javasolt megközelítés

A **legbiztonságosabb** megoldás a **2. pont** (CreateStorybook.tsx), mert:
- Garantálja, hogy bármelyik útvonalon érkezik a felhasználó, tiszta lappal indul
- Egyetlen helyen kell módosítani
- A session storage csak a wizard működése közben hasznos (ha a felhasználó véletlenül frissíti az oldalt)

**Kiegészítésként** érdemes az 1. és 3. pontot is megcsinálni a konzisztencia érdekében.

## Érintett fájlok

1. `src/pages/CreateStorybook.tsx` - session storage törlése mount-kor
2. `src/pages/Dashboard.tsx` - mindkét wizard storage törlése
3. `src/components/wizard/BookCreationWizard.tsx` - storybook storage törlése navigálás előtt

