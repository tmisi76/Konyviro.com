
# Terv: Export Javítása - Teljes Könyv Exportálás

## Probléma Diagnosztizálása

A vizsgálat során kiderült, hogy **két különböző probléma** van:

### 1. Elsődleges Probléma: Hiányzó Tartalom az Adatbázisban
Az "Új szakkönyv" projektben:
- **14 fejezet** létezik
- **193 blokk** van, de **mind az 1. fejezethez** van rendelve
- A többi 13 fejezet **üres** (0 blokk)
- A `word_count = 60198`, de a blokkokban csak **~4100 szó** van ténylegesen

Ez azt jelenti, hogy az írás során **tartalom veszett el** - a `write-scene` job-ok "completed" státuszúak, de a tartalom nem került be a blokkokba.

### 2. Másodlagos Probléma: Export Nem Ellenőrzi a Tartalmat
Az export függvények (kliens és szerver oldali egyaránt) nem figyelmeztetnek, ha egy fejezet üres.

---

## Megoldási Terv

### A) Azonnali Javítás: Export Logika Ellenőrzés

Mivel az export helyesen működik (a meglévő blokkokat exportálja), a probléma valójában az, hogy **a tartalomnak kellene létezni a többi fejezetben is**.

Az export rendszer már helyesen működik:
- Edge function (`export-book`): lekéri az összes fejezetet és blokkokat - ✅
- Kliens oldali (`exportUtils.ts`): lekéri a blokkokat chapter_id-nként - ✅

### B) Gyökérok Megoldása: Tartalom Visszaállítás/Újraírás

A `writing_jobs` tábla tartalmazza, hogy **melyik jelenet melyik fejezethez tartozik**, de a blokkok nem kerültek be.

**Opció 1**: "Újraírás" gomb a Dashboard-on, ami újra futtatja az elakadt jeleneteket
**Opció 2**: Migrációs script, ami a `writing_jobs.scene_outline` alapján újra létrehozza a hiányzó blokkokat

### C) Export Figyelmeztetés (Javasolt Javítás Most)

Adjunk figyelmeztetést az export előtt, ha a fejezetek üresek:

```typescript
// BookExportModal.tsx - export előtt ellenőrzés
const emptyChapters = chapters.filter(ch => !chapterContents[ch.id]?.trim());
if (emptyChapters.length > chapters.length * 0.5) {
  // Figyelmeztetés: "A fejezetek több mint fele üres!"
}
```

---

## Összefoglalás

| Probléma | Ok | Megoldás |
|----------|-----|----------|
| Csak 1. fejezet exportálódik | A többi fejezet üres az adatbázisban | Az írás során tartalom veszett - újra kell generálni |
| 60K szó helyett 4K van | A `word_count` frissült, de a blokkok nem mentődtek | Ellenőrizni kell a `write-scene` edge function mentési logikáját |
| Export nem figyelmeztet | Nincs üres fejezet ellenőrzés | Figyelmeztetés hozzáadása export előtt |

---

## Ajánlott Következő Lépések

1. **Vizsgálat**: A `write-scene` és `process-writing-job` edge function-ök logikájának ellenőrzése - miért nem mentődik a tartalom a blokkokba
2. **Javítás**: A blokkmentési logika hibájának kijavítása
3. **Helyreállítás**: Lehetőség biztosítása a felhasználónak, hogy újra futtassa az írást a hiányzó fejezetekre

**Az export logika önmagában helyes** - a probléma az, hogy a tartalom nem létezik az adatbázisban.
