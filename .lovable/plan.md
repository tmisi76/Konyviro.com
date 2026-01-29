

# Javítási Terv: Magyar Kiejtés az `eleven_turbo_v2_5` Modellel

## Probléma Összefoglalása

A jelenlegi ElevenLabs API hívások a `eleven_multilingual_v2` modellt használják, ami **nem támogatja** a `language_code: "hu"` paramétert. Ezért az API 400-as hibát ad vissza:

```
"unsupported_language": "Model 'eleven_multilingual_v2' does not support the language_code hu."
```

## Megoldás

Az `eleven_turbo_v2_5` modellre váltás, amely:
- Támogatja a magyar nyelvet (`hu` language_code)
- Gyorsabb (alacsonyabb késleltetés)
- Kiváló minőségű hang 32 nyelven

## Érintett Fájlok

| Fájl | Változás |
|------|----------|
| `supabase/functions/elevenlabs-tts-preview/index.ts` | `model_id` csere: `eleven_multilingual_v2` → `eleven_turbo_v2_5` |
| `supabase/functions/process-audiobook-chapter/index.ts` | `model_id` csere: `eleven_multilingual_v2` → `eleven_turbo_v2_5` |

## Technikai Részletek

### 1. elevenlabs-tts-preview/index.ts

**Jelenlegi kód (33-36. sor):**
```typescript
body: JSON.stringify({
  text: sampleText,
  model_id: "eleven_multilingual_v2",
  language_code: "hu",
  ...
})
```

**Javított kód:**
```typescript
body: JSON.stringify({
  text: sampleText,
  model_id: "eleven_turbo_v2_5",
  language_code: "hu",
  ...
})
```

### 2. process-audiobook-chapter/index.ts

**Jelenlegi kód (148-151. sor):**
```typescript
body: JSON.stringify({
  text: fullText,
  model_id: "eleven_multilingual_v2",
  language_code: "hu",
  ...
})
```

**Javított kód:**
```typescript
body: JSON.stringify({
  text: fullText,
  model_id: "eleven_turbo_v2_5",
  language_code: "hu",
  ...
})
```

## Implementációs Sorrend

1. `elevenlabs-tts-preview/index.ts` módosítása
2. `process-audiobook-chapter/index.ts` módosítása
3. Mindkét Edge Function újratelepítése

## Várt Eredmény

- Az „Előnézet" gomb működik a 4 narrátornál
- A hangok magyar kiejtéssel szólalnak meg
- A generált hangoskönyvek magyar nyelvűek lesznek
- Nincs több `unsupported_language` hiba

