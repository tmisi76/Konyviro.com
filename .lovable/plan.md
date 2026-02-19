

# Koncepció generálás JSON truncation hiba javítása

## Probléma

A `generate-story` edge function `max_tokens: 4000`-re van állítva (301. sor), de a fikciós válasz (title + logline + synopsis + protagonist + antagonist + setting + themes + 8 plotPoints + chapters + characters) rendszeresen túllépi ezt a limitet. Az AI válasz félbeszakad, csonka JSON-t ad vissza, amit a repair logika sem tud megjavítani.

A logból: "Raw response length: 8524" - a gateway válasz ugyan 8524 byte, de a tényleges content az AI-tól a 4000 token limit miatt csonkul.

## Megoldás

### 1. `max_tokens` emelése (supabase/functions/generate-story/index.ts, 301. sor)

`max_tokens: 4000` --> `max_tokens: 8000`

Ez a memory-ban is említett korábbi érték, ami korábban működött. A jelenlegi 4000 túl alacsony a teljes fikciós JSON-hoz (characters tömbbel együtt).

### 2. JSON repair logika javítása (422-435. sor)

A jelenlegi truncation repair csak a `"chapters"` mezőre figyel. Ha a csonkulás a `"characters"` tömbben történik, nem javít. Bovítem:
- A repair logika ellenőrzi a `"characters"` tömb csonkulását is
- Ha a legutolsó teljes objektum megtalálható, ott zárja le a JSON-t
- Robusztusabb bracket-balancing a `repairAndParseJSON` mintájára

### 3. Prompt tömörítése (76-80. sor)

A chapter summary limitet 15-ről 10 szóra csökkentem, és a characters-nél a `backstory` mezőt "max 1 mondat"-ra szűkítem, hogy kevesebb token kelljen.

## Érintett fájl

| Fájl | Változás |
|------|---------|
| `supabase/functions/generate-story/index.ts` | max_tokens emelés 8000-re, JSON repair javítás, prompt tömörítés |

