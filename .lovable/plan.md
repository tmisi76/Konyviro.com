
# Javítási terv: A fejezet tartalom mentés hiányzó oszlopa

## Probléma azonosítása

A logok egyértelműen mutatják a hibát:

```
Scene 7 completed with 467 words, total chapter: 467 words
Project 6b8ba81d completed but has no content - skipping email
```

### Gyökérok

A `chapters` táblában **nincs `content` oszlop**! 

Jelenlegi oszlopok a `chapters` táblában:
- id, project_id, title, sort_order, created_at, updated_at
- status, summary, key_points, word_count
- scene_outline, generation_status, quality_score, quality_issues
- tension_level, character_appearances
- writing_status, current_scene_index, scenes_completed, writing_error

**HIÁNYZIK: `content` (text)**

A `process-writing-job` edge function megpróbálja:
```typescript
await supabase.from("chapters")
  .update({ 
    content: newContent,  // ❌ Ez az oszlop NEM LÉTEZIK!
    word_count: totalWords,
    ...
  })
```

A Supabase csendben figyelmen kívül hagyja a nem létező oszlopokra való update-et, ezért:
- A `word_count` frissül (467 words)
- A `content` sosem mentődik (mert nincs ilyen oszlop)
- A projekt "befejezettnek" tűnik, de üres

---

## Szükséges változtatás

### 1. Adatbázis migráció - `content` oszlop hozzáadása

```sql
-- Fejezet tartalom oszlop hozzáadása
ALTER TABLE public.chapters 
ADD COLUMN content TEXT;

-- Opcionálisan: index az üres tartalom kereséséhez
CREATE INDEX idx_chapters_has_content 
ON public.chapters ((content IS NOT NULL AND content != ''));
```

### 2. Nincs kód változás szükséges

A `process-writing-job` edge function már helyesen van megírva - a `content` mezőt próbálja frissíteni. Amint az oszlop létezik, működni fog.

---

## Összefoglaló

| Probléma | Megoldás |
|----------|----------|
| Nincs `content` oszlop | ALTER TABLE hozzáadja |
| A tartalom nem mentődik | Az új oszlopba mentődik |
| `word_count` helyes, de nincs szöveg | Mindkettő rendben lesz |

## Tesztelési terv

1. Futtassuk a migrációt
2. Indítsunk el egy új könyvírást VAGY folytassuk a meglévőt
3. Ellenőrizzük a `chapters.content` mezőt - legyen benne szöveg
4. A Dashboard-on látszódjon a helyes word count ÉS a tartalom
