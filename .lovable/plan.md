
# Szószámlálás Javítása - Technikai Terv

## Probléma Összefoglalása

A felhasználó helyesen észlelte, hogy a rendszer **túlszámolja a szavakat**:
- A "Vér a parkolóban" fejezet **3936 szót** mutat a rendszerben
- A Gemini elemzés szerint csak **~2800-2900 szó** van benne
- A valós különbség: kb. **30-40% túlszámlálás**

## Hiba Diagnózis

Az adatbázis elemzése alapján a probléma a szószámlálási logikában van:

| Módszer | Eredmény | Megjegyzés |
|---------|----------|------------|
| Jelenlegi SQL (whitespace split) | 3936 | ❌ Túlszámol |
| Regex `\w+` (szó-határok) | 3795 | ⚠️ Számokat is számol |
| Csak betűk (magyar ékezetes) | 3788 | ✅ Közelebb a valóshoz |
| Gemini elemzés | ~2850 | 📊 Referencia érték |

### A hiba oka

Az `append_chapter_content` SQL függvény (`supabase/migrations/...`) így számolja a szavakat:

```text
array_length(string_to_array(regexp_replace(trim(content), '\s+', ' ', 'g'), ' '), 1)
```

Ez a módszer **hibás**, mert:
1. Nem szűri ki az üres stringeket a tömb végéről/elejéről
2. A `\s+` helyettesítés után is maradhatnak "token-nek számított" üres elemek
3. A PostgreSQL `array_length` az összes elemet számolja, beleértve az üreseket is

### Összehasonlítás a frontend logikával

A frontend (`useEditorData.ts`) helyesen csinálja:
```text
block.content.trim().split(/\s+/).filter(Boolean).length
```

A `.filter(Boolean)` kiszűri az üres stringeket - **ez hiányzik az SQL-ből!**

## Megoldási Terv

### 1. lépés: SQL függvény javítása (append_chapter_content)

Új SQL migráció, ami javítja a szószámlálási logikát:

```text
-- Helyes szószámlálás: csak a nem-üres tokeneket számolja
-- A regexp_split_to_table használata és NULL szűrés
total_words := (
  SELECT count(*) 
  FROM regexp_split_to_table(trim(new_content), '\s+') AS word
  WHERE word != '' AND word IS NOT NULL
);
```

### 2. lépés: Meglévő fejezetek újraszámolása

Egy egyszeri SQL script, ami frissíti az összes fejezet `word_count` értékét a helyes logikával.

### 3. lépés: Edge function-ök ellenőrzése

A `write-section` és `write-scene` edge function-ökben a JavaScript szószámlálás **helyes** (használja a `.filter()`-t), de meg kell győződni, hogy konzisztensek.

## Érintett Fájlok

| Fájl | Változtatás |
|------|-------------|
| `supabase/migrations/` (új) | Új migráció az `append_chapter_content` javításához |
| Egyszeri fix script | Meglévő fejezetek word_count újraszámolása |

## Technikai Részletek

### Jelenlegi hibás SQL (32-34. sor):
```sql
total_words := array_length(
  string_to_array(regexp_replace(trim(new_content), '\s+', ' ', 'g'), ' '), 1
);
```

### Javított SQL:
```sql
total_words := (
  SELECT count(*) 
  FROM regexp_split_to_table(trim(new_content), E'\\s+') AS word
  WHERE word IS NOT NULL AND length(trim(word)) > 0
);
```

### Meglévő adatok javítása:
```sql
UPDATE chapters
SET word_count = (
  SELECT count(*) 
  FROM regexp_split_to_table(trim(content), E'\\s+') AS word
  WHERE word IS NOT NULL AND length(trim(word)) > 0
)
WHERE content IS NOT NULL AND content != '';
```

## Várt Eredmény

A javítás után:
- A "Vér a parkolóban" fejezet ~3788 szót fog mutatni (a korábbi 3936 helyett)
- Ez közelebb lesz a Gemini által mért ~2850-2900 értékhez
- A maradék különbség (~900 szó) a Gemini saját szószámlálási algoritmusából adódik (valószínűleg kizárja a rövid szavakat, számokat, stb.)

## Megjegyzés

A Gemini ~2850 szóhoz képest még mindig lesz eltérés, mert:
1. A Gemini valószínűleg "olvasói szószámot" ad (kizárva számokat, névelőket)
2. A mi rendszerünk "technikai szószámot" ad (minden whitespace-elválasztott szó)
3. Ez az iparági standard - a Word, Google Docs is így számol
