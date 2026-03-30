

# Fix: Technikai metaadatok eltávolítása a generált szövegből

## Probléma
Az AI visszaadja a prompt kontextus-fejléceit (pl. `FEJEZET: "Tisztogatás"`, `JELENET: #3`, `MŰFAJ: fiction`) a generált szövegben. Ezek megjelennek a könyvben.

## Javítás

### 1. `supabase/functions/_shared/quality-checker.ts` — `stripMarkdown` bővítése
A `stripMarkdown` függvénybe új regex szabályok a technikai metaadatok eltávolítására:
```typescript
// Strip technical metadata lines that AI echoes back
.replace(/^(FEJEZET|JELENET|MŰFAJ|KONTEXTUS|KÖNYV MŰFAJA|JELENET SORSZÁMA|FEJEZET CÍME|SZEKCIÓ SORSZÁMA|SZEKCIÓ CÍME|POV KARAKTER|HELYSZÍN|IDŐ|HOSSZ|HANGNEM):.*$/gm, '')
// Clean up resulting empty lines
.replace(/\n{3,}/g, '\n\n')
```

### 2. `supabase/functions/auto-lector/index.ts` — Prompt kiegészítés
A system prompt végéhez és a user prompt záró utasításához hozzáadni:
```
- NE add vissza a FEJEZET/JELENET/MŰFAJ metaadatokat — CSAK a prózát!
```

### 3. `supabase/functions/write-scene/index.ts` — Prompt kiegészítés
A záró utasításba (`CSAK a jelenet szövegét add vissza...` sor) beleírni:
```
NE ismételd vissza a FEJEZET/JELENET/MŰFAJ/KONTEXTUS fejléceket!
```

### 4. `supabase/functions/write-section/index.ts` — Prompt kiegészítés
Ugyanaz mint a write-scene-nél, a záró utasításokba beleírni a tiltást.

Összesen 4 fájl, kis módosítások. A `stripMarkdown` bővítés biztonsági háló — még ha az AI mégis visszaadná, a post-processing eltávolítja.

