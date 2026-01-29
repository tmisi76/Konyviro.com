
# Javítási Terv: Magyar Kiejtés a Hangoskönyv Rendszerben

## Probléma Azonosítása

Az ElevenLabs API-nak **nincs megadva a nyelv** (`language_code` paraméter), ezért:
- Automatikusan angol szövegként értelmezi a magyar szöveget
- A kiejtés angol akcentussal történik, ami nem megfelelő

## Megoldás

Az ElevenLabs API támogatja a `language_code` paramétert (ISO 639-1 formátum). A magyar nyelv kódja: **`hu`**

Ezt hozzá kell adni mindkét Edge Function-höz:

---

## Érintett Fájlok

| Fájl | Változás |
|------|----------|
| `supabase/functions/elevenlabs-tts-preview/index.ts` | + `language_code: "hu"` paraméter |
| `supabase/functions/process-audiobook-chapter/index.ts` | + `language_code: "hu"` paraméter |

---

## Részletes Implementáció

### 1. elevenlabs-tts-preview/index.ts

**Jelenlegi kód (33-40. sor):**
```typescript
body: JSON.stringify({
  text: sampleText,
  model_id: "eleven_multilingual_v2",
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
  },
}),
```

**Javított kód:**
```typescript
body: JSON.stringify({
  text: sampleText,
  model_id: "eleven_multilingual_v2",
  language_code: "hu",  // Magyar kiejtés
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
  },
}),
```

### 2. process-audiobook-chapter/index.ts

**Jelenlegi kód (148-157. sor):**
```typescript
body: JSON.stringify({
  text: fullText,
  model_id: "eleven_multilingual_v2",
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
  },
  previous_text: previousText,
  next_text: nextText,
}),
```

**Javított kód:**
```typescript
body: JSON.stringify({
  text: fullText,
  model_id: "eleven_multilingual_v2",
  language_code: "hu",  // Magyar kiejtés
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
  },
  previous_text: previousText,
  next_text: nextText,
}),
```

---

## Technikai Háttér

Az ElevenLabs `eleven_multilingual_v2` modell:
- Támogat 29+ nyelvet, köztük a magyart
- A `language_code` paraméter biztosítja a helyes kiejtést
- ISO 639-1 kódot használ (magyar = `hu`)

Az API dokumentáció szerint:
> "Language code (ISO 639-1) used to enforce a language for the model and text normalization."

---

## Implementációs Sorrend

1. `elevenlabs-tts-preview/index.ts` módosítása - minta hangok
2. `process-audiobook-chapter/index.ts` módosítása - teljes hangoskönyvek
3. Edge Function-ök újratelepítése

---

## Várt Eredmény

- A 4 narrátor előnézete **magyar kiejtéssel** szól
- A generált hangoskönyvek **magyar kiejtéssel** készülnek
- A szöveg minden esetben érthetően, magyarul lesz felolvasva
