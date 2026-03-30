

# Fix: "Cannot access 'project' before initialization" hiba a generate-section-outline-ban

## Probléma
A `generate-section-outline/index.ts` **81. sorában** a kód `project`-re hivatkozik:
```typescript
const isInvestigative = !isFiction && (project?.nonfiction_book_type === "investigative" || ...);
```
De a `project` változó csak a **120. sorban** jön létre (a Supabase lekérdezés után). Ez JavaScript TDZ (Temporal Dead Zone) hibát okoz, ami minden outline generálást megbuktat — ezért mind a 14 job failed.

## Javítás

### `supabase/functions/generate-section-outline/index.ts`
- Az `isInvestigative` meghatározást áthelyezni a 120. sor utánra (ahol a `project` már elérhető)
- A `systemPrompt` kiválasztást szintén oda mozgatni

Konkrétan: a 80-102. sorokat átszervezni úgy, hogy:
1. **80. sor**: `const isFiction = genre === "fiction";` — ez maradhat (nem függ `project`-től)
2. **81-101. sor**: Az `isInvestigative` definíciót és az `INVESTIGATIVE_OUTLINE_PROMPT` stringet és a `systemPrompt` kiválasztást a 122. sor utánra kell mozgatni
3. A prompt konstansok (INVESTIGATIVE_OUTLINE_PROMPT) maradhatnak a helyükön, csak az `isInvestigative` és `systemPrompt` kell lejjebb

### Egyetlen fájl módosítás, ~10 sor áthelyezés.

