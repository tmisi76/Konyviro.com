

# Lektorálás Timeout Javítás

## Gyökérokoz Azonosítása

A `process-proofreading` edge function a **Claude Opus 4** modellt használja közvetlenül az Anthropic API-n keresztül. Egy ~10000 karakteres fejezet lektorálása Claude Opus-szal **2-3 percig** is tarthat, de:

- A `fetchWithRetry` timeout: **120 másodperc**
- Az Edge Function wall-time limit: **~90 másodperc**

**Eredmény:** A function timeout-ol az első fejezet közben, mielőtt bármit elmenthetne.

## Megoldási Lehetőségek

| Opció | Előny | Hátrány |
|-------|-------|---------|
| **A) Lovable AI Gateway használata** | Nincs API key szükséges, gyorsabb modellek | Nincs Claude Opus, de van Gemini Pro |
| **B) Claude Sonnet használata Opus helyett** | 2-3x gyorsabb válaszidő, Anthropic API marad | Valamivel kisebb minőség |
| **C) Streaming válasz** | Megakadályozza a timeout-ot | Bonyolultabb implementáció |

## Javasolt Megoldás: Opció A - Lovable AI Gateway

A `refine-chapter` function már sikeresen használja a Lovable AI Gateway-t. Ugyanezt a mintát alkalmazzuk a lektorálásra is:

- **Modell:** `google/gemini-2.5-pro` (legerősebb a komplex lektoráláshoz)
- **Timeout:** Nincs szükség AbortController-re, a gateway gyorsabban válaszol
- **Költség:** Nincs API költség (beépített a Lovable-ba)

## Implementációs Terv

### Módosítandó Fájl

**`supabase/functions/process-proofreading/index.ts`**

### Változtatások

1. **API végpont cseréje:**
   - Régi: `https://api.anthropic.com/v1/messages`
   - Új: `https://ai.gateway.lovable.dev/v1/chat/completions`

2. **Modell cseréje:**
   - Régi: `claude-opus-4-20250514`
   - Új: `google/gemini-2.5-pro` (vagy `openai/gpt-5` a még jobb minőséghez)

3. **Header és body formátum:**
   - Régi: Anthropic formátum (`x-api-key`, `anthropic-version`, `system` mező)
   - Új: OpenAI-kompatibilis formátum (`Authorization: Bearer`, `messages` tömb `system` role-lal)

4. **Válasz parse:**
   - Régi: `data.content[0].text`
   - Új: `data.choices[0].message.content`

5. **Timeout csökkentése:**
   - Régi: 120s
   - Új: 60s (a Lovable Gateway gyorsabb)

### Kód Változtatások

```typescript
// ELŐTTE (Anthropic API)
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const result = await fetchWithRetry({
  url: "https://api.anthropic.com/v1/messages",
  options: {
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
      system: PROOFREADING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: ... }],
    }),
  },
  timeoutMs: 120000,
});
const text = data.content[0].text;

// UTÁNA (Lovable AI Gateway)
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const result = await fetchWithRetry({
  url: "https://ai.gateway.lovable.dev/v1/chat/completions",
  options: {
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: PROOFREADING_SYSTEM_PROMPT },
        { role: "user", content: ... }
      ],
      max_tokens: 16000,
    }),
  },
  timeoutMs: 60000,
});
const text = data.choices[0].message.content;
```

## Összefoglaló

| Változás | Fájl | Leírás |
|----------|------|--------|
| API csere | `process-proofreading/index.ts` | Anthropic → Lovable AI Gateway |
| Modell csere | `process-proofreading/index.ts` | Claude Opus → Gemini 2.5 Pro |
| Timeout csökkentés | `process-proofreading/index.ts` | 120s → 60s |
| Válasz formátum | `process-proofreading/index.ts` | Anthropic → OpenAI format |

Ez a javítás megoldja a timeout problémát, mivel a Lovable AI Gateway sokkal gyorsabban válaszol, és nem kell API kulcsot fizetni az Anthropic-nak.

