
# Automatikus Könyvírás - Valódi Indítás a Wizard-ból

## Probléma

A felhasználó az "Automatikus Könyvírás" opciót választja a wizard végén, de:
1. A wizard bezáródik és a dashboard-ra navigál
2. A könyv nem íródik - **a felhasználónak rá kell kattintani az "Indítás" gombra**
3. Megtévesztő: "Könyvírás elindítva" toast jelenik meg, de valójában nem történik semmi

## Gyökérok

A `useBookWizard.ts` → `startAutoWriting` funkció:
1. Beállítja a projektet `in_progress` státuszra
2. Meghívja a `start-book-writing` edge function-t
3. **DE** ha az edge function hibát ad (pl. "nincsenek fejezetek"), a projekt `in_progress` státuszban marad

A `useBackgroundWriter.ts` → `canStart` feltétel:
```typescript
const canStart = progress.status === 'idle' || progress.status === 'failed' || progress.status === 'in_progress';
```

**Tehát az `in_progress` státusz is "indítható"-nak számít**, ezért jelenik meg az "Indítás" gomb.

## Megoldás

### 1. Módosítás a WritingModeDialog.tsx-ben

Amikor az "Automatikus Könyvírás" opciót választják:
- Ne csak "Tovább" legyen a gomb, hanem **"Automatikus Könyvírás Indítása"**
- A dialóguson belül **megerősítő állapotot** kell mutatni
- Sikeres indítás után **záródjon be a dialógus és navigáljon dashboard-ra**

### 2. Új megerősítő képernyő a dialógusban

A WritingModeDialog komponens kiegészítése:
- Ha `automatic` mód kiválasztva és a "Tovább" gombra kattintanak
- **Mutasson egy sikeres indítás képernyőt** (zöld pipa, üzenet)
- "A könyved írása elindult! Zárd be ezt az ablakot."
- "Vissza a Dashboard-ra" gomb

### 3. Hibakezelés javítása a startAutoWriting-ban

Ha az edge function hibát ad:
- A projekt státuszát vissza kell állítani (nem `in_progress`)
- Toast hibaüzenet megjelenítése
- **Ne navigáljon dashboard-ra hiba esetén**

## Érintett fájlok

| Fájl | Változtatás |
|------|-------------|
| `src/components/wizard/WritingModeDialog.tsx` | Sikeres indítás képernyő + gomb szöveg |
| `src/hooks/useBookWizard.ts` | Hibakezelés - státusz visszaállítása |
| `src/components/wizard/steps/Step6ChapterOutline.tsx` | Dialógus kezelés frissítése |

## Részletes terv

### WritingModeDialog.tsx módosítások

```text
Új state:
- isStarted: boolean - sikeres indítás után true
- startError: string | null - hiba esetén

Új UI állapot:
- Ha isStarted = true:
  - Zöld pipa ikon
  - "Sikeresen elindult a könyved írása!"
  - "A Dashboard-on követheted a folyamatot."
  - "Vissza a Dashboard-ra" gomb

Gomb logika:
- Ha automatic + !isStarted: "Automatikus Könyvírás Indítása"
- Ha automatic + isStarting: "Indítás..." (loading)
- Ha automatic + isStarted: "Vissza a Dashboard-ra"
```

### Step6ChapterOutline.tsx módosítások

```text
handleModeSelect módosítása:
- automatic mód: 
  - NE zárja be a dialógust azonnal
  - Hívja meg az onStartAutoWriting-et
  - Ha sikeres: setShowSuccessInDialog(true)
  - Ha hiba: setShowErrorInDialog(error)
```

### useBookWizard.ts hibakezelés

```text
startAutoWriting:
- Ha edge function hiba:
  - Állítsa vissza a projektet 'draft' státuszra (nem in_progress)
  - Térjen vissza false-al
  - Toast már megjelenik

- Ha sikeres:
  - NE navigáljon azonnal - hagyjuk a dialógusra
  - Térjen vissza true-val
```

## Felhasználói élmény a javítás után

```text
1. Felhasználó kiválasztja: "🤖 Automatikus Könyvírás"
2. Kattint: "Automatikus Könyvírás Indítása"
3. Loading állapot: "Indítás..."
4. ✅ Siker esetén: 
   - Zöld pipa + "A könyved írása elindult!"
   - "Vissza a Dashboard-ra" gomb
5. ❌ Hiba esetén:
   - Hibaüzenet a dialógusban
   - Lehetőség újrapróbálkozásra
6. Dashboard-on: A könyv már AKTÍVAN íródik (nincs "Indítás" gomb!)
```
