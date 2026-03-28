

# Karakternév-konzisztencia és POV-tartás javítása a könyvíró motorban

## Probléma gyökere

Az AI jelenet-generáló promptokban (write-scene, process-next-scene) **nincs explicit utasítás a karakternevek rögzítésére**. A prompt megadja a karakterlistát, de nem mondja ki egyértelműen: "KIZÁRÓLAG ezeket a neveket használd, NE változtasd meg, NE magyarosítsd, NE cseréld fel." Az AI ezért:

1. **Névmagyarosítás**: "Elena Moretti" → "Varga Elena" (az AI a magyar névsorrend szabályt félreértelmezi és magyar vezetéknevet ad)
2. **Névcsere fejezetek között**: Nincs elég erős kontextus a nevek rögzítésére fejezetek között
3. **POV-váltás**: A `scene.pov` mező szöveges ("Harmadik személy"), de nincs explicit tiltás az elbeszélői nézőpont váltásra

## Javítás: 3 fájl, 3 célzott változás

### 1. `supabase/functions/_shared/prompt-builder.ts` — Karakter névlista blokk

Új exportált függvény: `buildCharacterNameLock()` — erős, egyértelmű utasítás az AI-nak:

```
KARAKTEREK NÉVSORA (VÁLTOZTATHATATLAN):
A történetben KIZÁRÓLAG az alábbi neveket használd. NE változtasd meg, NE magyarosítsd, NE adj nekik más nevet, becenevet vagy vezetéknevet. Ha egy karakter neve "Elena Moretti", mindig "Elena Moretti" marad, SOHA NEM "Varga Elena" vagy "Adél".

- Elena Moretti (főszereplő)
- Marco Bianchi (antagonista)
...

NÉVSORREND SZABÁLY PONTOSÍTÁS: A magyar névsorrend (Vezetéknév + Keresztnév) CSAK magyar nevekre vonatkozik (pl. "Kovács János"). Külföldi nevek (olasz, angol, stb.) az EREDETI sorrendben maradnak (pl. "Elena Moretti", NEM "Moretti Elena").
```

A `buildCharacterContext()` függvényt is kiegészítjük ezzel a tiltással.

### 2. `supabase/functions/_shared/prompt-builder.ts` — POV enforcement

Új függvény: `buildPOVEnforcement()` — explicit POV-tartási szabály:

```
NÉZŐPONT SZABÁLY (KÖTELEZŐ):
A jelenet nézőpontja: [Harmadik személy, korlátozott - Elena Moretti]
TILOS nézőpontot váltani a jelenet közben. Ha harmadik személy korlátozott, KIZÁRÓLAG a POV karakter gondolatait, érzéseit írd le. NE váltsd első személyre. NE írd le más karakterek belső gondolatait.
```

### 3. `supabase/functions/process-next-scene/index.ts` és `write-scene/index.ts` — Prompt frissítés

Mindkét fájlban a user prompt-ba beépítjük:
- `buildCharacterNameLock(characters)` — a névlista tiltással
- POV enforcement szekciót a scene.pov és a projekt fiction_style.pov alapján

### 4. `supabase/functions/generate-detailed-outline/index.ts` — Outline szint

Az outline generálásnál is átadjuk a karakter neveket, hogy a jelenet vázlatokban már a helyes nevek szerepeljenek a `pov` mezőben.

## Érintett fájlok

| Fájl | Változás |
|------|---------|
| `supabase/functions/_shared/prompt-builder.ts` | `buildCharacterNameLock()` + `buildPOVEnforcement()` + `buildCharacterContext()` megerősítés |
| `supabase/functions/process-next-scene/index.ts` | Prompt kiegészítés a névzár és POV blokkal |
| `supabase/functions/write-scene/index.ts` | Prompt kiegészítés a névzár és POV blokkal |
| `supabase/functions/generate-detailed-outline/index.ts` | Karakternév-lista átadás az outline generálásba |

