
# Magyar Nyelvtan Szabályok Hozzáadása + Lektorálás Claude Sonnet 4.5-re

## Áttekintés

1. **Szövegírás**: Magyar nyelvtani szabályok hozzáadása minden író edge function-höz
2. **Lektorálás**: Átállítás Claude Sonnet 4.5-re az Anthropic API-n keresztül

## 1. Új Magyar Nyelvtan Szabály Blokk

Minden szövegíró edge function-höz hozzáadjuk:

```typescript
const HUNGARIAN_GRAMMAR_RULES = `
## MAGYAR NYELVI SZABÁLYOK (KÖTELEZŐ):

NÉVSORREND: Magyar névsorrend: Vezetéknév + Keresztnév (pl. "Kovács János", NEM "János Kovács").

PÁRBESZÉD FORMÁZÁS:
- Magyar párbeszédjelölés: gondolatjel (–) a sor elején
- Idézőjel használata: „..." (magyar idézőjel, NEM "...")
- Példa helyes formátum:
  – Hová mész? – kérdezte Anna.
  – A boltba – válaszolta.

ÍRÁSJELEK:
- Gondolatjel: – (hosszú, NEM -)
- Három pont: ... (NEM …)
- Vessző MINDIG a kötőszavak előtt: "de, hogy, mert, ha, amikor, amely, ami"

KERÜLENDŐ HIBÁK:
- NE használj angolszász névsorrendet
- NE használj tükörfordításokat ("ez csinál értelmet" → "ennek van értelme")
- NE használj angol idézőjeleket ("..." → „...")
- NE használj felesleges névelőket angolosan

NYELVTANI HELYESSÉG:
- Ragozás: ügyelj a magyar ragozás helyességére
- Szórend: magyar szórend, NEM angol (ige-alany-tárgy)
- Összetett szavak: egybe vagy külön az MTA szabályai szerint
`;
```

## 2. Érintett Fájlok - Szövegírás

| Fájl | Változás |
|------|----------|
| `supabase/functions/generate/index.ts` | HUNGARIAN_GRAMMAR_RULES hozzáadása a SYSTEM_PROMPTS-okhoz |
| `supabase/functions/write-scene/index.ts` | HUNGARIAN_GRAMMAR_RULES hozzáadása az UNIVERSAL_FICTION_RULES után |
| `supabase/functions/write-section/index.ts` | HUNGARIAN_GRAMMAR_RULES hozzáadása a FICTION és NONFICTION system promptokhoz |
| `supabase/functions/process-next-scene/index.ts` | HUNGARIAN_GRAMMAR_RULES hozzáadása a PROMPTS-okhoz |

## 3. Lektorálás Átállítása Claude Sonnet 4.5-re

### Érintett Fájlok

| Fájl | Változás |
|------|----------|
| `supabase/functions/proofread-chapter/index.ts` | Lovable Gateway → Anthropic API (Claude Sonnet 4.5) |
| `supabase/functions/process-proofreading/index.ts` | Lovable Gateway → Anthropic API (Claude Sonnet 4.5) |

### Technikai Változások

**Régi (Lovable AI Gateway):**
```typescript
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({ model, max_tokens: 16000, stream: true, messages: [...] }),
});
```

**Új (Anthropic API - Claude Sonnet 4.5):**
```typescript
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const response = await fetch("https://api.anthropic.com/v1/messages", {
  headers: {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 32000,
    system: PROOFREADING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Lektoráld: "${chapter.title}"\n\n${chapter.content}` }],
  }),
});
```

### Miért Claude Sonnet 4.5?

- **Erősebb kontextuskövetés**: Nem "ugrik" szöveget hosszú inputnál
- **Magyar nyelv**: Jobb teljesítmény agglutináló nyelveken
- **32K output**: Nagyobb kimenet limit hosszú fejezeteknél
- **API key már létezik**: `ANTHROPIC_API_KEY` megvan a secrets-ben

## 4. Eltávolítandó Logika

- `getProofreadingModel()` függvény (már nem kell dinamikus modell)
- `system_settings` lekérdezés a lektorálás modellhez
- `DEFAULT_PROOFREADING_MODEL` konstans

## 5. Összefoglaló

| Komponens | Változás |
|-----------|----------|
| `generate/index.ts` | + HUNGARIAN_GRAMMAR_RULES |
| `write-scene/index.ts` | + HUNGARIAN_GRAMMAR_RULES |
| `write-section/index.ts` | + HUNGARIAN_GRAMMAR_RULES |
| `process-next-scene/index.ts` | + HUNGARIAN_GRAMMAR_RULES |
| `proofread-chapter/index.ts` | Lovable Gateway → Claude Sonnet 4.5 |
| `process-proofreading/index.ts` | Lovable Gateway → Claude Sonnet 4.5 |
