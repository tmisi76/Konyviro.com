

# Lektorálás Prompt Frissítése

## Áttekintés

A lektorálási rendszer prompt-jának cseréje mindkét edge function-ben az új, tisztább és célratörőbb verzióra.

## Érintett Fájlok

| Fájl | Változás |
|------|----------|
| `supabase/functions/proofread-chapter/index.ts` | Prompt csere (18-36. sor) |
| `supabase/functions/process-proofreading/index.ts` | Prompt csere (10-28. sor) |

## Új Prompt

```typescript
const PROOFREADING_SYSTEM_PROMPT = `Feladat: Javítsd az alábbi szöveget publikálható, profi magyar minőségre.

Instrukciók a javításhoz:
1. Javítsd a nyelvtani és helyesírási hibákat.
2. Egészítsd ki a hiányos vagy félbehagyott mondatokat a kontextus alapján (ez kritikus!).
3. Cseréld a magyartalan (angolból tükörfordított) kifejezéseket természetes magyar fordulatokra.
4. Javítsd a logikai bukfenceket a szövegfolyamban.

KIMENETI SZABÁLYOK (Szigorúan tartsd be!):
- KIZÁRÓLAG a javított szöveget add válaszul.
- NE írj bevezetőt (pl. "Itt a javított szöveg...").
- NE írj magyarázatot vagy felsorolást a hibákról.
- A kimenet azonnal a szöveg első mondatával kezdődjön.`;
```

## Változtatások Összefoglalója

### Régi Prompt (Eltávolítva)
- "Te egy tapasztalt magyar lektor vagy..." szerepleírás
- 5 pontos elemzési szempont lista
- "Tartsd meg a szerző hangját" típusú szabályok
- Stilisztika, bekezdés-tagolás szempontok

### Új Prompt (Hozzáadva)
- Közvetlen feladat meghatározás: "publikálható, profi magyar minőség"
- **Kritikus új pont**: Hiányos mondatok kiegészítése
- Angolból tükörfordított kifejezések javítása
- Logikai bukfencek javítása
- Szigorú kimeneti szabályok - semmi bevezető vagy magyarázat

## Implementáció

Mindkét fájlban a `PROOFREADING_SYSTEM_PROMPT` konstanst cseréljük le az új verzióra.

