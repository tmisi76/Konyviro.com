# Wizard: scroll-to-top minden lépésváltáskor

## Probléma

A `BookCreationWizard`-ban (és a `StorybookWizard`-ban) lépésváltáskor (`nextStep`/`prevStep`) az oldal megőrzi az aktuális görgetési pozíciót. Mivel egyes lépések hosszabbak (pl. Adatok lépés a célközönséggel, hangnemmel, hosszúsággal, instrukciókkal), ha lent vagyunk és a "Tovább" gombbal ugrunk, az új, rövidebb lépés is alulról jelenik meg — a felhasználó nem látja a tetejét.

## Megoldás

A `currentStep` változására automatikusan a tetejére görgetünk. Ezt a wizard komponensekben egy `useEffect`-tel oldjuk meg.

### 1. `src/components/wizard/BookCreationWizard.tsx`

Hozzáadunk egy `useEffect`-et, ami `currentStep` változására azonnal a tetejére ugrik (smooth nélkül, mert a step-átmenet animáció már fut, így instant a tisztább):

```tsx
useEffect(() => {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
}, [currentStep]);
```

### 2. `src/components/storybook/StorybookWizard.tsx`

Ugyanezt a logikát hozzáadjuk a Mesekönyv wizardhoz is, hogy konzisztens legyen a viselkedés.

## Érintett fájlok

- `src/components/wizard/BookCreationWizard.tsx`
- `src/components/storybook/StorybookWizard.tsx`

## Mit NEM változtatunk

- A `WizardProgress` és a sticky header marad ugyanúgy.
- A step-átmenet animáció (framer-motion x-tengely slide) változatlan.
- A wizard logikája, állapotkezelése érintetlen.
