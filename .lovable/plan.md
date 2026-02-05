

# Terv: Wizard Automatikus Könyvírás Indítás Javítása

## Probléma Azonosítása

A "Új szakkönyv" projektnél a wizard befejezésekor az `in_progress` státusz beállításra került, de a `start-book-writing` edge function **soha nem hívódott meg**, ezért nincs `writing_jobs` rekord és az írás nem indul el.

**Adatbázis állapot:**
- `wizard_step: 9` (utolsó lépés)
- `writing_status: in_progress`
- `writing_started_at: NULL` ← Az edge function nem futott!
- `chapters: 14` (mentve)
- `writing_jobs: 0` (üres!)

## Gyökérok

A `Step6ChapterOutline` komponens `handleModeSelect` függvényében van egy fallback ág, amely `onStartAutoWriting` hiánya esetén a régi `startWriting()` függvényt hívja meg. A `startWriting()` csak beállítja a státuszt, de **NEM** hívja meg az edge function-t.

```typescript
// Step6ChapterOutline.tsx - jelenlegi logika
if (mode === "automatic") {
  if (onStartAutoWriting) {
    // Helyes: meghívja az edge function-t
    await onStartAutoWriting();
  } else {
    // HIBA: Csak státuszt állít, de NEM indítja el az írást!
    onStartWriting(false);
  }
}
```

## Megoldás

### Megközelítés változtatás

Egyszerűsítjük a logikát: amikor a felhasználó kiválasztja az "Automatikus Könyvírás" módot és bezárja a dialógust, az írás **azonnal elindul** az edge function meghívásával. Nincs fallback a régi viselkedésre.

### Érintett fájlok

| Fájl | Változtatás |
|------|-------------|
| `src/components/wizard/steps/Step6ChapterOutline.tsx` | Kötelező `onStartAutoWriting` hívás |
| `src/hooks/useBookWizard.ts` | `startWriting` törlése (deprecated) |

## Részletes Változtatások

### 1. Step6ChapterOutline.tsx

A `handleModeSelect` függvényben távolítsuk el a fallback ágat és tegyük kötelezővé az `onStartAutoWriting` használatát:

```typescript
const handleModeSelect = async (mode: WritingMode) => {
  if (onEstimatedMinutesChange) {
    onEstimatedMinutesChange(estimatedMinutes);
  }

  if (mode === "automatic") {
    // Kötelezően használjuk az onStartAutoWriting-ot
    if (!onStartAutoWriting) {
      console.error("onStartAutoWriting callback is required for automatic mode");
      setAutoWriteError("Hiba: Az automatikus írás nem elérhető");
      return;
    }
    
    setIsStartingBackground(true);
    setAutoWriteError(null);
    try {
      const success = await onStartAutoWriting();
      if (success) {
        setAutoWriteStarted(true);
      } else {
        setAutoWriteError("Nem sikerült elindítani az automatikus könyvírást.");
      }
    } catch (error) {
      console.error("Failed to start automatic writing:", error);
      setAutoWriteError("Hiba történt az automatikus írás indításakor");
    }
    setIsStartingBackground(false);
  } else if (mode === "semiAutomatic" && onStartSemiAutomatic) {
    // ...existing logic
  }
};
```

### 2. Step6ChapterOutlineProps interface frissítése

A `onStartAutoWriting` prop legyen kötelező (optional → required):

```typescript
interface Step6ChapterOutlineProps {
  // ...other props
  onStartAutoWriting: () => Promise<boolean>;  // Már nem optional!
  // ...
}
```

### 3. Fallback ág eltávolítása

Töröljük az `else` blokkot, amely a régi `onStartWriting(false)` hívást tartalmazza.

## Folyamat a javítás után

```text
1. Felhasználó a Step6/Step8-on (fejezet outline)
2. Kattint: "Könyv Írása Indítása"
3. Dialógus megjelenik
4. Kiválasztja: "🤖 Automatikus Könyvírás"
5. Kattint: "Írás Indítása"
6. → onStartAutoWriting() meghívása
7. → start-book-writing edge function meghívása
8. → writing_jobs rekordok létrejönnek
9. → pg_cron elkezdi feldolgozni
10. Dialógus: "Sikeresen elindult!"
11. Kattint: "Vissza a Dashboard-ra"
12. → onResetWizard() meghívása (wizard state törlése)
13. → navigate("/dashboard")
14. Dashboard-on a könyv "Írás folyamatban" státuszban van
```

## Technikai részletek

A `start-book-writing` edge function működése:
1. Lekéri a projekthez tartozó fejezeteket
2. Minden fejezethez létrehoz egy `generate_outline` típusú job-ot (ha nincs scene_outline)
3. Beállítja a `writing_status = 'generating_outlines'`
4. Beállítja a `writing_started_at`-ot
5. A pg_cron (30 mp intervallum) feldolgozza a job-okat

