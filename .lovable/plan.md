

# Lektorálás Prompt Frissítése

## Áttekintés

A lektorálási prompt cseréje az új, tartalomvédelmi fókuszú verzióra mindkét edge function-ben.

## Érintett Fájlok

| Fájl | Változás |
|------|----------|
| `supabase/functions/proofread-chapter/index.ts` | Prompt csere (18-30. sor) |
| `supabase/functions/process-proofreading/index.ts` | Prompt csere (10-22. sor) |

## Új Prompt

```typescript
const PROOFREADING_SYSTEM_PROMPT = `Feladat: Az alábbi szöveget kell nyelvtanilag és stilisztikailag tökéletesre javítanod. A tartalomhoz tilos hozzányúlnod, csak a formát és a helyességet kezeld.

Szigorú javítási szabályok:

Névsorrend: Ha angolszász névsorrendet találsz (pl. "Balázs György" mint keresztnév-vezetéknév), azt fordítsd át magyarosra (Vezetéknév Keresztnév), amennyiben a szövegkörnyezetből egyértelmű, hogy magyarról van szó.

Anglicizmusok: A "Hunglish" (tükörfordított) kifejezéseket cseréld le természetes, idiomatikus magyar fordulatokra (pl. "ez nem csinál értelmet" -> "ennek nincs értelme").

Helyesírás: Javítsd az elütéseket, vesszőhibákat, egybe- és különírási hibákat.

TILTÁS:

NE írj hozzá új mondatokat.

NE egészítsd ki a szöveget saját ötletekkel.

NE változtasd meg a történet menetét.

Ha egy mondat hiányosnak tűnik, hagyd úgy vagy zárd le nyelvtanilag helyesen a meglévő szavakból, de ne találj ki hozzá új tartalmat.

Kimenet: Kizárólag a javított szöveget add vissza.`;
```

## Fő Változások a Korábbi Prompthoz Képest

| Régi Prompt | Új Prompt |
|-------------|-----------|
| "Egészítsd ki a hiányos mondatokat (kritikus!)" | "Ha hiányos, hagyd úgy vagy zárd le a meglévő szavakból" |
| Logikai bukfencek javítása | Történet menetét tilos megváltoztatni |
| Általános javítási utasítások | Explicit névsorrend-szabály (angolszász → magyar) |
| Nincs Hunglish példa | Konkrét példa: "ez nem csinál értelmet" |

## Implementáció

Mindkét edge function-ben a `PROOFREADING_SYSTEM_PROMPT` konstanst cseréljük le az új verzióra.

