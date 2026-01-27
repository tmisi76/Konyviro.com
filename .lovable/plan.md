
## Összefoglaló Terv - Mesekönyv Javítások

### Azonosított Problémák

1. **Szöveg olvashatóság** - A gradient háttér nem biztosít elegendő kontrasztot
2. **Mentés nem működik** - A `projects_genre_check` constraint nem tartalmazza a "mesekonyv" értéket
3. **Export nem profi minőségű** - Jelenleg HTML-t generál, nem CloudConvert-es PDF-et
4. **Borító és szerkezet hiányzik** - Nincs AI-generált borító, nincs címlap

---

### 1. Szöveg Háttér Javítás

**Fájl:** `src/components/storybook/steps/StorybookPreviewStep.tsx`

**Változtatások:**
- 134. sor (bal oldal): `bg-gradient-to-t from-black/70 to-transparent` → `bg-black/70 rounded-t-lg`
- 168. sor (jobb oldal): `bg-gradient-to-t from-black/70 to-transparent` → `bg-black/70 rounded-t-lg`
- 216. sor (mobil): `bg-gradient-to-t from-black/80 via-black/50 to-transparent` → `bg-black/70 rounded-t-xl`

---

### 2. Mentés Javítás - Adatbázis Constraint

**Migráció szükséges:**

```sql
-- Add 'mesekonyv' to the genre constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_genre_check;

ALTER TABLE projects ADD CONSTRAINT projects_genre_check 
CHECK (genre = ANY (ARRAY['szakkönyv', 'szakkonyv', 'fiction', 'erotikus', 'mesekonyv']));
```

---

### 3. CloudConvert Exportálás

**Fájl:** `supabase/functions/export-storybook/index.ts`

**Teljes átírás CloudConvert integrációval:**

A meglévő `export-book` edge function mintáját követve:

1. **HTML generálás** - Teljes mesekönyv HTML struktúrával:
   - Borító oldal (AI generált kép vagy gradient háttér címmel)
   - Címlap (fehér oldal a címmel és szerzővel)
   - Tartalmi oldalak (illusztrációk + szöveg)
   - Záró oldal

2. **CloudConvert integráció:**
   - HTML-t base64 kódolás
   - CloudConvert job létrehozása (HTML → PDF konverzió)
   - Export rekord mentése az `exports` táblába
   - Job ID visszaadása polling-hoz

3. **A4 méretű professzionális PDF:**
   - 300 DPI minőség
   - Bleed opció támogatása
   - Print-ready beállítások

**Fájl:** `src/components/storybook/StorybookExport.tsx`

**Változtatások:**
- Polling logika hozzáadása (mint a book exportnál)
- `export-status` edge function hívása a CloudConvert job státuszának ellenőrzésére
- Letöltési link megjelenítése amikor kész

---

### 4. Borító Generálás és Struktúra

**Fájl:** `supabase/functions/generate-storybook/index.ts`

**Változtatások:**
- Borító prompt generálása az AI-nak
- `coverPrompt` mező hozzáadása a válaszhoz

**Fájl:** `src/hooks/useStorybookWizard.ts`

**Változtatások:**
- `generateCover` függvény hozzáadása
- A `generateStory` után automatikusan hívja a borító generálást
- Borító URL mentése a `data.coverUrl`-be

**Fájl:** `supabase/functions/export-storybook/index.ts`

**HTML struktúra:**
```text
1. Borító oldal - Teljes oldalas AI kép + cím overlay
2. Belső címlap - Fehér háttér, cím középen, szerző
3-N. Tartalmi oldalak - Illusztrációk szöveggel
N+1. Záró oldal - "Vége" + InkStory branding
```

---

### Érintett Fájlok Összesítése

| Fájl | Változtatás típusa |
|------|-------------------|
| `supabase/migrations/xxx.sql` | Új migráció - genre constraint |
| `src/components/storybook/steps/StorybookPreviewStep.tsx` | 3 CSS osztály módosítás |
| `supabase/functions/export-storybook/index.ts` | Teljes átírás CloudConvert-re |
| `src/components/storybook/StorybookExport.tsx` | Polling logika hozzáadása |
| `supabase/functions/generate-storybook/index.ts` | Borító prompt hozzáadása |
| `src/hooks/useStorybookWizard.ts` | Borító generálás függvény |

---

### Várható Eredmény

- A szöveg mindig jól olvasható lesz a 70%-os fekete háttéren
- A mesekönyvek sikeresen menthetők lesznek az adatbázisba
- Professzionális PDF exportálás CloudConvert-tel
- Az exportált PDF struktúrája: Borító → Címlap → Oldalak → Záró
