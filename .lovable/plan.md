
# Terv: AI Formázás + Modell Egységesítés

## 1. PROBLÉMA: Markdown Jelölők és Csupa Nagybetűs Címek

A generált szövegben `**` jelölők és CSUPA NAGYBETŰS címsorok jelennek meg.

### Érintett Fájlok és Hibák:

| Fájl | Hiba |
|------|------|
| `supabase/functions/generate/index.ts` | `NO_MARKDOWN_RULE` sor 10: "Címsorokhoz írj normál nagybetűs szöveget" |
| `supabase/functions/write-section/index.ts` | sor 91: "Használj informatív alcímeket (NAGYBETŰVEL, # nélkül)" |
| `supabase/functions/process-next-scene/index.ts` | Hiányzik a NO_MARKDOWN_RULE a PROMPTS-ból |

### Javítás:

**Új NO_MARKDOWN_RULE (minden érintett fájlban):**
```
FORMÁZÁSI SZABÁLY (KÖTELEZŐ):
- NE használj markdown jelölőket (**, ##, ***, ---, stb.)
- Címsorokhoz használj normál mondatformátumot új sorban (pl. "Az első lépés")
- TILOS a CSUPA NAGYBETŰS írás (kivéve rövidítések: EU, AI, USA)
- Kiemeléshez egyszerűen hangsúlyos szavakat használj, jelölés nélkül
- Listákhoz használj gondolatjelet (–) és új sort
- Az olvasó tiszta, folyamatos prózát kapjon
```

---

## 2. PROBLÉMA: Anthropic Claude Használata Lovable AI Helyett

**13 edge function használ Anthropic Claude-ot** a beépített Lovable AI (Gemini 3 Flash) helyett!

### Érintett Edge Functions:

| Edge Function | Jelenlegi Modell | Szükséges Változtatás |
|---------------|------------------|----------------------|
| `write-scene/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `process-next-scene/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `write-section/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `generate-story/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `generate-chapter-outline/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `generate-detailed-outline/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `generate-section-outline/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `generate-chapter-summary/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `generate-story-ideas/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `generate-character-voice/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `analyze-writing-style/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `book-coach/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |
| `fact-check/index.ts` | `claude-sonnet-4-20250514` | Lovable AI Gateway |

### Már Gemini-t Használó Functions (OK):

| Edge Function | Modell | Státusz |
|---------------|--------|---------|
| `generate/index.ts` | `google/gemini-3-flash-preview` | ✅ OK |
| `refine-chapter/index.ts` | `google/gemini-3-flash-preview` | ✅ OK |
| `generate-storybook/index.ts` | `google/gemini-3-flash-preview` | ✅ OK |
| `generate-cover/index.ts` | `google/gemini-3-pro-image-preview` | ✅ OK (képgenerálás) |
| `generate-storybook-illustration/index.ts` | `google/gemini-2.5-flash-image` | ✅ OK (képgenerálás) |

---

## Részletes Változtatások

### Minden Érintett Edge Function-ben:

**1. API Endpoint Csere:**
```typescript
// RÉGI (Anthropic)
await fetch("https://api.anthropic.com/v1/messages", {
  headers: {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }]
  })
});

// ÚJ (Lovable AI Gateway)
await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: {
    "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview",
    max_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ]
  })
});
```

**2. API Key Változtatás:**
```typescript
// RÉGI
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

// ÚJ
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
```

**3. Válasz Formátum Változás:**
```typescript
// RÉGI (Anthropic)
const content = response.content?.[0]?.text || "";

// ÚJ (OpenAI-kompatibilis)
const content = response.choices?.[0]?.message?.content || "";
```

---

## Összefoglaló Változtatások

| Fájl | Változtatás |
|------|-------------|
| `generate/index.ts` | NO_MARKDOWN_RULE frissítés (csupa nagybetű tiltás) |
| `write-section/index.ts` | NO_MARKDOWN_RULE + Lovable AI Gateway + válasz parsing |
| `write-scene/index.ts` | Lovable AI Gateway + válasz parsing |
| `process-next-scene/index.ts` | NO_MARKDOWN_RULE hozzáadás + Lovable AI Gateway |
| `generate-story/index.ts` | Lovable AI Gateway + válasz parsing |
| `generate-chapter-outline/index.ts` | Lovable AI Gateway + válasz parsing |
| `generate-detailed-outline/index.ts` | Lovable AI Gateway + válasz parsing |
| `generate-section-outline/index.ts` | Lovable AI Gateway + válasz parsing |
| `generate-chapter-summary/index.ts` | Lovable AI Gateway + válasz parsing |
| `generate-story-ideas/index.ts` | Lovable AI Gateway + válasz parsing |
| `generate-character-voice/index.ts` | Lovable AI Gateway + válasz parsing |
| `analyze-writing-style/index.ts` | Lovable AI Gateway + válasz parsing |
| `book-coach/index.ts` | Lovable AI Gateway (streaming támogatással) |
| `fact-check/index.ts` | Lovable AI Gateway + válasz parsing |

---

## Előnyök

1. **Költségcsökkentés**: Lovable AI beépített, nincs külső API költség
2. **Egységes rendszer**: Minden eszköz ugyanazt a modellt használja
3. **Jobb formázás**: Tiszta próza markdown jelölők nélkül
4. **Olvasható címsorok**: Normál mondatformátum, nem CSUPA NAGYBETŰS
5. **Adminisztrátor kontroll**: A system_settings táblán keresztül a modell centrálisan módosítható

---

## Technikai Megjegyzések

- A `LOVABLE_API_KEY` már konfigurálva van a Supabase secrets-ben
- A Lovable AI Gateway OpenAI-kompatibilis API-t használ
- A streaming (book-coach) szintén támogatott
- A retry logika megmarad, csak az endpoint változik
