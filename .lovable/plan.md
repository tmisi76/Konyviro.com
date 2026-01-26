

# Mesekönyv mentés és képgenerálás javítása

## Azonosított problémák

### 1. probléma: Hiányzó `storybook_data` oszlop

**Hibakód a konzolban:**
```
PGRST204: Could not find the 'storybook_data' column of 'projects' in the schema cache
```

**Oka:** A `saveProject` függvény (`src/hooks/useStorybookWizard.ts`, 336. sor) egy `storybook_data` oszlopba próbál menteni, de ez az oszlop nem létezik a `projects` táblában.

**Megoldás:** Adatbázis migráció szükséges - hozzá kell adni a `storybook_data` oszlopot a `projects` táblához.

### 2. probléma: Képgenerálás nem indul el

A `generate-storybook-illustration` edge function-nek nincs logja, tehát a frontend nem hívja meg. Valószínűleg a mentési hiba vagy az előző lépések megszakítják a folyamatot, mielőtt oda jutna.

---

## Javítási terv

### 1. lepes: Adatbazis migracio - storybook_data oszlop hozzaadasa

A `projects` tablat boviteni kell egy `storybook_data` nevu JSONB oszloppal, ami tartalmazza a mesekonyv osszes adatat (tema, korosztaly, karakterek, oldalak, illusztraciok URL-jei stb.)

```sql
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS storybook_data JSONB DEFAULT NULL;
```

Ezzel az oszloppal a mesekonyv adatai JSON-kent tarolhatoak, es kesobb visszatolthetok.

### 2. lepes: RLS policy ellenorzese

Meg kell bizonyosodni arrol, hogy a meglevo RLS policy-k megfeleloen engedik az UPDATE es INSERT muveleteket a `storybook_data` oszlopon is.

### 3. lepes: Edge function deploy ellenorzese

Az alabbiak deployolasa szukseges:
- `generate-storybook`
- `generate-storybook-illustration`

---

## Technikai reszletek

### Uj adatbazis oszlop

| Tabla | Oszlop | Tipus | Default | Leiras |
|-------|--------|-------|---------|--------|
| `projects` | `storybook_data` | JSONB | NULL | Mesekonyv metaadatok es oldalak tarolasa |

### storybook_data struktura

A `storybook_data` JSON mezoben tarolando adatok:

```json
{
  "theme": "fantasy",
  "customThemeDescription": "...",
  "ageGroup": "3-6",
  "illustrationStyle": "watercolor",
  "characters": [
    { "id": "...", "name": "Anna", "role": "main", "photoUrl": "..." }
  ],
  "storyPrompt": "...",
  "generatedStory": "...",
  "pages": [
    {
      "id": "page-1",
      "pageNumber": 1,
      "text": "Egyszer volt...",
      "illustrationPrompt": "...",
      "illustrationUrl": "https://..."
    }
  ],
  "coverUrl": "..."
}
```

### Modositando fajlok

| Fajl | Valtozas |
|------|----------|
| Adatbazis migracio | `storybook_data` JSONB oszlop hozzaadasa |
| Edge function deploy | `generate-storybook-illustration` ujra deploy-olasa |

---

## Varható eredmeny

1. A mesekonyv mentese mukodni fog
2. A kepek generalasa vegigfut minden oldalra
3. A felhasznalo megtekintheti es exportalhatja az elkeszult mesekönyvet

