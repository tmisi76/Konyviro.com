

# Wizard Automatikus Könyvírás - Reset Időzítési Hiba Javítása

## Probléma

Amikor az automatikus könyvírás sikeresen elindul:
1. A `startAutoWriting()` függvény meghívja a `reset()` metódust
2. A `reset()` visszaállítja a `currentStep`-et **1-re**
3. A React újrarendereli a wizard-ot az első lépéssel
4. A siker dialógus bezáródik és a felhasználó az 1. lépésen találja magát

A dialógus bezárása és a Dashboard navigálás **előtt** történik a reset, ami elrontja a flow-t.

## Gyökérok

A `useBookWizard.ts` 548. sorában:
```typescript
// startAutoWriting sikeresen fut
reset();  // <- AZONNAL reseteli, de a dialógus még látható!
return true;
```

A reset töröl minden adatot és `setCurrentStep(1)` hívással visszaviszi az 1. lépésre - mielőtt a felhasználó rákattintana a "Vissza a Dashboard-ra" gombra.

## Megoldás

A reset hívást át kell helyezni a **navigálás pillanatára** - ne az edge function sikere után, hanem akkor, amikor a felhasználó ténylegesen a Dashboard-ra navigál.

### 1. `useBookWizard.ts` módosítása

A `startAutoWriting()` függvényből **töröljük a `reset()` hívást**:

```typescript
// startAutoWriting végén:
// NE reset()-eljünk itt! Hagyjuk a dialog-ra
// reset();  // <-- TÖRÖLNI!
return true;
```

### 2. `WritingModeDialog.tsx` módosítása

A `handleGoToDashboard()` függvényben hívjuk meg a reset-et (callback-ként kapva):

```typescript
const handleGoToDashboard = () => {
  onOpenChange(false);
  onResetWizard?.();  // <-- ÚJ: reset itt történik!
  navigate("/dashboard");
};
```

### 3. Props bővítése

A `WritingModeDialog` kapjon egy új `onResetWizard` callback prop-ot, amit a `Step6ChapterOutline` továbbít a wizard `reset` függvényéből.

## Érintett fájlok

| Fájl | Változtatás |
|------|-------------|
| `src/hooks/useBookWizard.ts` | `reset()` hívás törlése a `startAutoWriting`-ból |
| `src/components/wizard/WritingModeDialog.tsx` | Új `onResetWizard` prop, hívása navigáláskor |
| `src/components/wizard/steps/Step6ChapterOutline.tsx` | `onResetWizard` prop továbbítása |

## Részletes változtatások

### useBookWizard.ts (548. sor környéke)

**Előtte:**
```typescript
// Clear wizard data but don't navigate - let the dialog handle navigation
reset();
return true;
```

**Utána:**
```typescript
// Don't reset here - let the dialog handle it when navigating to dashboard
// The dialog will call onResetWizard when user clicks "Back to Dashboard"
return true;
```

### WritingModeDialog.tsx

**Új prop:**
```typescript
interface WritingModeDialogProps {
  // ... meglévő props
  onResetWizard?: () => void;  // ÚJ
}
```

**handleGoToDashboard módosítása:**
```typescript
const handleGoToDashboard = () => {
  onOpenChange(false);
  if (onResetWizard) {
    onResetWizard();
  }
  navigate("/dashboard");
};
```

### Step6ChapterOutline.tsx

**Új prop a komponensben:**
```typescript
interface Step6ChapterOutlineProps {
  // ... meglévő props
  onResetWizard?: () => void;  // ÚJ
}
```

**WritingModeDialog hívása:**
```typescript
<WritingModeDialog
  // ... meglévő props
  onResetWizard={onResetWizard}  // ÚJ
/>
```

### BookCreationWizard.tsx

**Step6ChapterOutline hívása:**
```typescript
<Step6ChapterOutline
  // ... meglévő props
  onResetWizard={reset}  // ÚJ
/>
```

## Folyamat a javítás után

```text
1. Felhasználó kiválasztja: "🤖 Automatikus Könyvírás"
2. Kattint: "Írás Indítása"
3. Edge function sikeresen elindul
4. → return true (de NEM hívunk reset-et!)
5. Dialógus mutatja: "Sikeresen elindult!" + zöld pipa
6. Felhasználó kattint: "Vissza a Dashboard-ra"
7. → onResetWizard() meghívása (reset itt történik)
8. → navigate("/dashboard")
9. Dashboard betölt, a könyv már aktívan íródik
```

## Technikai részletek

A reset azért fontos, hogy:
- Törölje a sessionStorage-ből a wizard adatokat
- Ne legyen "folytatás" lehetőség ha újra megnyitják a /create-book oldalt

De **csak akkor** szabad meghívni, amikor:
- A felhasználó ténylegesen elhagyja a wizard-ot
- A navigálás megtörtént

