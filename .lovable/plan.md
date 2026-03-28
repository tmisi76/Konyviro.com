

# Könyvíró motor minőségi javítások - IMPLEMENTÁLVA

## Elvégzett változtatások

### 1. `prompt-builder.ts` — 4 új függvény ✅
- `buildScenePositionContext()` — Jelenetpozíció-specifikus utasítások (nyitó hook, köztes feszültség, záró cliffhanger)
- `buildAntiSummaryRules()` — Összefoglaló-stílus tiltása, dramatizálás kikényszerítése
- `buildDialogueVarietyRules()` — Párbeszéd-tag változatosság ("mondta" korlátozás, akció-tagek)
- `buildAntiRepetitionPrompt()` — Előző jelenet ismétlésének megelőzése

### 2. `quality-checker.ts` — Bővített minőségellenőrzés ✅
- `shouldRetry` mező a `QualityResult`-ban
- Összefoglaló-stílus detektálás (>30% "aztán/később/ezután" mondatkezdés)
- Párbeszéd-tag ismétlődés ("mondta" >5x/1000 szó)
- `buildQualityRetryPrompt()` — javítási utasítások az újrapróbálkozáshoz

### 3. `process-next-scene/index.ts` ✅
- Új prompt blokkok integrálva
- Quality-based retry implementálva (max 1 extra próbálkozás)
- Context snippet csökkentve 3000→2000 karakter + anti-repetition

### 4. `write-scene/index.ts` ✅
- Új prompt blokkok integrálva
- Quality-based retry implementálva
- pov_goal, pov_emotion_start/end támogatás

### 5. `generate-detailed-outline/index.ts` ✅
- pov_goal, pov_emotion_start, pov_emotion_end mezők a JSON sémában
