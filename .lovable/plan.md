

# Fix: Hiányzó `buildBodyLanguageVarietyRules` export a prompt-builder-ből

## A probléma

A `write-section` Edge Function nem tud elindulni (BOOT_ERROR), mert importálja a `buildBodyLanguageVarietyRules` függvényt a `_shared/prompt-builder.ts`-ből, de ez a függvény soha nem lett hozzáadva a fájlhoz.

A logokban ez látszik:
```
worker boot error: The requested module '../_shared/prompt-builder.ts' 
does not provide an export named 'buildBodyLanguageVarietyRules'
```

Ez blokkolja az összes jelenetírást — ezért áll 0/83 szekciónál a könyved.

## Javítás

### 1. `supabase/functions/_shared/prompt-builder.ts` — Hiányzó függvény hozzáadása

A `buildDialogueVarietyRules()` függvény után hozzáadom a `buildBodyLanguageVarietyRules()` exportot, amely a testi reakciók variálására ad szabályokat (hasonló mintával mint a dialogue rules):

```typescript
export function buildBodyLanguageVarietyRules(): string {
  return `\n\n--- TESTBESZÉD VARIÁCIÓ SZABÁLYOK ---
TESTI REAKCIÓ KORLÁTOZÁSOK:
- "gyomra összeszorult/görcsbe rándult" → MAX 1x per fejezet. Alternatívák: torka kiszáradt, háta közepén hideg futott végig, tenyere verejtékezni kezdett, ujjhegyei elzsibbadtak
- "szíve a torkában dobogott" → MAX 1x per fejezet. Alternatívák: pulzusa felszökött, halántéka lüktetett, mellkasa összeszorult
- "ujjai elfehéredtek" → MAX 1x per fejezet. Alternatívák: ujjai begörbültek, keze ökölbe szorult, körme a tenyerébe vájt
- "megborzongott/libabőrös lett" → MAX 1x per fejezet. Alternatívák: a tarkóján égett a bőr, karján felállt a szőr, gerince mentén hideg áradt szét
MINDEN testi reakciót VÁLTOZATOSAN használj — ne ismételd ugyanazt a jeleneten belül!`;
}
```

Ez egyetlen fájl egyetlen módosítása — a `write-section` és minden más edge function ezután újra el tud indulni, és a könyved írása folytatódik.

