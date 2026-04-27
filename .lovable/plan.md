## Cél

Eltávolítani a `generate-story` Edge Function-ből a beégetett magyar névgenerátort, és helyette egy felhasználó által beállítható **karakter-nemzetiség / nyelv** opciót adni a fikció wizardhoz. Ez alapján az AI maga generál nemzetiséghez illő neveket (magyar → János, Kovács; angol → John, Smith; spanyol → Juan, García; stb.).

## Probléma röviden

Jelenleg a `generate-story/index.ts` 5–51. sorai egy fix `HUNGARIAN_FIRST_NAMES_MALE/FEMALE` és `HUNGARIAN_LAST_NAMES` listából véletlenszerű neveket választanak, és kötelezően ezeket nyomja a promptba. Ezért még angol/spanyol stb. helyszín esetén is magyar neveket kap a felhasználó.

## Változtatások

### 1. Új típus a wizardban — `src/types/wizard.ts`

Új `CharacterNationality` típus + opciólista, és a `FictionStyleSettings` bővítése egy `characterNationality` mezővel.

```ts
export type CharacterNationality =
  | "hungarian" | "english" | "american" | "german" | "french"
  | "spanish" | "italian" | "scandinavian" | "japanese" | "russian"
  | "mixed" | "fantasy" | "ai_choose";

export const NATIONALITY_OPTIONS: { id: CharacterNationality; label: string; flag: string }[] = [
  { id: "ai_choose",   label: "AI döntse el (a helyszín alapján)", flag: "✨" },
  { id: "hungarian",   label: "Magyar (pl. Kovács János)",          flag: "🇭🇺" },
  { id: "english",     label: "Angol (pl. John Smith)",             flag: "🇬🇧" },
  { id: "american",    label: "Amerikai",                            flag: "🇺🇸" },
  { id: "german",      label: "Német",                               flag: "🇩🇪" },
  { id: "french",      label: "Francia",                             flag: "🇫🇷" },
  { id: "spanish",     label: "Spanyol/Latin",                       flag: "🇪🇸" },
  { id: "italian",     label: "Olasz",                               flag: "🇮🇹" },
  { id: "scandinavian",label: "Skandináv",                           flag: "🇸🇪" },
  { id: "japanese",    label: "Japán",                               flag: "🇯🇵" },
  { id: "russian",     label: "Orosz",                               flag: "🇷🇺" },
  { id: "mixed",       label: "Vegyes nemzetközi",                   flag: "🌍" },
  { id: "fantasy",     label: "Fantasy / kitalált",                  flag: "🐉" },
];
```

A `FictionStyleSettings` interfész kap egy új mezőt:
```ts
characterNationality: CharacterNationality;
```
Default érték: `"ai_choose"`.

### 2. Wizard UI — `src/components/wizard/steps/Step3FictionStyle.tsx`

Új szekció a meglévő opciók után (a `setting` mező mellett vagy után), egy lenyíló/chip-választó a `NATIONALITY_OPTIONS` alapján. Ikon: `Users` vagy `Globe`. State: `characterNationality`, default `"ai_choose"`. Belekerül a `handleSubmit` payloadba.

### 3. Payload átadása — `src/components/wizard/steps/Step5StoryDetail.tsx`

A `supabase.functions.invoke("generate-story", { body: ... })` body-ja kapjon egy új mezőt:
```ts
characterNationality: fictionStyle?.characterNationality ?? "ai_choose",
```

(A komponens propjai között már van `fictionStyle` valószínűleg — ha nincs, hozzá kell adni a `Step5StoryDetailProps` interfészhez és a `BookCreationWizard.tsx`-ben átadni.)

### 4. `generate-story` Edge Function — `supabase/functions/generate-story/index.ts`

**Törlendő:**
- 5–27. sorok: `HUNGARIAN_FIRST_NAMES_MALE`, `HUNGARIAN_FIRST_NAMES_FEMALE`, `HUNGARIAN_LAST_NAMES` konstansok.
- 29–51. sorok: `getRandomNames()` függvény.
- 468–479. sorok: `randomNames` és `nameContext` blokk a `userPrompt`-ban.

**Helyette** új szöveges instrukció a fiction prompt-ágba a nemzetiség alapján:

```ts
const NATIONALITY_GUIDE: Record<string, string> = {
  hungarian:    "magyar nevek (pl. Kovács Anna, Nagy Bence) — vezetéknév + keresztnév sorrend",
  english:      "brit angol nevek (pl. James Whitmore, Eleanor Hayes)",
  american:     "amerikai nevek, etnikailag változatos (pl. Marcus Reed, Sofia Castillo)",
  german:       "német nevek (pl. Lukas Hoffmann, Anna Becker)",
  french:       "francia nevek (pl. Julien Moreau, Camille Lefèvre)",
  spanish:      "spanyol/latin-amerikai nevek (pl. Diego Herrera, Lucía Morales)",
  italian:      "olasz nevek (pl. Matteo Ricci, Giulia Conti)",
  scandinavian: "skandináv nevek (pl. Lars Eriksson, Astrid Lindqvist)",
  japanese:     "japán nevek (pl. Haruki Tanaka, Yuki Sato) — vezetéknév + keresztnév sorrend",
  russian:      "orosz nevek (pl. Dmitri Volkov, Anastasia Sokolova)",
  mixed:        "nemzetközileg vegyes nevek, többféle kulturális háttérből",
  fantasy:      "kitalált, fantasy stílusú nevek, NEM létező kultúrákból kölcsönözve",
  ai_choose:    "a történet helyszínéhez és kulturális kontextusához illő nevek",
};

const nationalityHint = NATIONALITY_GUIDE[characterNationality] ?? NATIONALITY_GUIDE.ai_choose;

const nameContext = `
KARAKTER NEVEK:
A szereplők kapjanak ${nationalityHint}.
A nevek legyenek VÁLTOZATOSAK, EGYEDIEK és HITELESEK az adott kultúrához.
TILOS a következő, túl gyakran használt sablon-nevek: Kovács Ádám, Kovács János, Nagy Péter, Szabó István, John Smith, John Doe.
Ne ismételd ugyanazt a vezeték- vagy keresztnevet több karakternél.`;
```

A `characterNationality` változót a request body-ból kell kiolvasni, default `"ai_choose"`. Backward compatible: ha a frontend nem küldi, az AI maga dönt → ugyanúgy működik új és régi hívás esetén.

### 5. Mit NEM érintünk

- `write-scene`, `write-section`, `process-next-scene` — ezek már a meglévő karakterlistából (chapter outline + characters tábla) dolgoznak, nem generálnak új neveket.
- Szakkönyv (`isNonfiction`) ág — ott eddig sem volt névgenerálás.
- Storybook (mesekönyv) — saját külön folyamat, ott nem releváns.

## Érintett fájlok

1. `src/types/wizard.ts` — új típus + opciólista, `FictionStyleSettings` bővítése.
2. `src/components/wizard/steps/Step3FictionStyle.tsx` — új UI szekció.
3. `src/components/wizard/steps/Step5StoryDetail.tsx` — új mező továbbítása az invoke body-ban (esetleg props-bővítés).
4. `src/components/wizard/BookCreationWizard.tsx` — ha kell, prop továbbítás.
5. `supabase/functions/generate-story/index.ts` — magyar névlisták és `getRandomNames` törlése, helyette nemzetiség-alapú prompt instrukció.

## Tesztelési forgatókönyv

1. Fikció wizard → Step3 stílus → új „Karakterek nemzetisége" szekció megjelenik, default „AI döntse el".
2. „Angol" választása → generált koncepcióban John/Emma típusú nevek, NEM Kovács János.
3. „Magyar" → továbbra is magyar nevek, de már nem a fix 40-es listából, hanem szabadabban.
4. „Fantasy" → kitalált nevek (Aerion, Mirella stb.).
5. Régi (mentett) wizard adat (nincs `characterNationality`) → fallback `ai_choose`, hibamentes generálás.