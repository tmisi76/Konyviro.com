
# AI Motor Váltás Adminisztrációs Panel

## Áttekintés

Az admin panelen lehetőség lesz dinamikusan választani a Lovable AI Gateway által támogatott modellek közül. A beállítás a `system_settings` táblában tárolódik, és a frontend + backend egyaránt onnan olvassa ki az aktuális modellt.

## Jelenlegi Helyzet

| Komponens | Probléma |
|-----------|----------|
| `AdminAISettings.tsx` | A modell választás már létezik, de nem használja a backend |
| `generate/index.ts` | Hardcoded `claude-sonnet-4-20250514` modell |
| `process-proofreading/index.ts` | Hardcoded `google/gemini-2.5-pro` modell |
| `AIAssistantPanel.tsx` | Hardcoded "Gemini Flash" badge |
| `system_settings` tábla | Van `ai_default_model` kulcs, de a backend nem olvassa |

## Támogatott Modellek (Lovable AI Gateway)

| Model ID | Név | Használat |
|----------|-----|-----------|
| `google/gemini-3-flash-preview` | Gemini 3 Flash | Gyors, kiegyensúlyozott (alapértelmezett) |
| `google/gemini-2.5-pro` | Gemini 2.5 Pro | Komplex feladatok, lektorálás |
| `google/gemini-2.5-flash` | Gemini 2.5 Flash | Gyors multimodális |
| `openai/gpt-5` | GPT-5 | Legerősebb következtetés |
| `openai/gpt-5-mini` | GPT-5 Mini | Költséghatékony |
| `openai/gpt-5.2` | GPT-5.2 | Legújabb OpenAI |

## Implementációs Terv

### 1. Edge Function Módosítások

**A) `supabase/functions/generate/index.ts`**
- Átállás Anthropic API-ról Lovable AI Gateway-re
- `system_settings` tábla olvasása az aktuális modellhez
- Fallback modell: `google/gemini-3-flash-preview`

```text
┌─────────────────────────────────────────────────────────────────┐
│  generate/index.ts                                              │
│  1. Lekéri system_settings.ai_default_model értékét            │
│  2. Ha nincs beállítva → google/gemini-3-flash-preview         │
│  3. Lovable AI Gateway hívás az adott modellel                 │
└─────────────────────────────────────────────────────────────────┘
```

**B) `supabase/functions/process-proofreading/index.ts`**
- Opcionálisan: külön lektorálási modell beállítás (`ai_proofreading_model`)
- Vagy: ugyanaz az alapértelmezett modell

### 2. Frontend Módosítások

**A) `src/hooks/useAIModel.ts` (új hook)**
- Lekéri és cache-eli az aktuális AI modell beállítást
- React Query-vel frissül, ha az admin módosítja

```typescript
export function useAIModel() {
  return useQuery({
    queryKey: ['ai-model'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'ai_default_model')
        .single();
      return data?.value || 'google/gemini-3-flash-preview';
    },
    staleTime: 60000,
  });
}
```

**B) `src/components/editor/AIAssistantPanel.tsx`**
- `getModelBadge()` függvény dinamikus modell név megjelenítése
- Hook használata a modell név lekéréséhez

```typescript
const { data: modelId } = useAIModel();

const getModelBadge = () => {
  const modelMap: Record<string, string> = {
    'google/gemini-3-flash-preview': 'Gemini 3 Flash',
    'google/gemini-2.5-pro': 'Gemini 2.5 Pro',
    'openai/gpt-5': 'GPT-5',
    // ...
  };
  return modelMap[modelId] || 'AI';
};
```

**C) `src/pages/admin/AdminAISettings.tsx`**
- A modell választás már működik, csak a mentést kell tesztelni
- Új "Lektorálási modell" választó hozzáadása (opcionális)

### 3. Adatbázis

A `system_settings` tábla már tartalmazza az `ai_default_model` kulcsot. Új rekord hozzáadása:

| key | value | category | description |
|-----|-------|----------|-------------|
| `ai_proofreading_model` | `google/gemini-2.5-pro` | ai | Lektoráláshoz használt AI modell |

### 4. Fájl Változtatások Összefoglalója

| Fájl | Változás |
|------|----------|
| `supabase/functions/generate/index.ts` | Anthropic → Lovable AI Gateway, modell beolvasás DB-ből |
| `supabase/functions/process-proofreading/index.ts` | Modell beolvasás DB-ből (opcionális külön beállítás) |
| `src/hooks/useAIModel.ts` | ÚJ: Hook a modell lekéréséhez |
| `src/components/editor/AIAssistantPanel.tsx` | Dinamikus modell badge |
| `src/pages/admin/AdminAISettings.tsx` | Lektorálási modell választó (opcionális) |

## Biztonsági Megfontolások

- A `system_settings` tábla RLS-sel védett (csak adminok módosíthatják)
- Az edge function service role-lal olvassa a beállításokat
- A frontend csak olvasási jogosultsággal rendelkezik

## Technikai Flow

```text
Admin beállítja a modellt
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  system_settings.ai_default_model = "google/gemini-2.5-pro"    │
└─────────────────────────────────────────────────────────────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌─────────────────────────┐    ┌─────────────────────────────────┐
│  Frontend (React Query) │    │  Edge Functions (on each call)  │
│  useAIModel() hook      │    │  SELECT FROM system_settings    │
│  → Badge frissül        │    │  → Modell használata            │
└─────────────────────────┘    └─────────────────────────────────┘
```

## Következő Lépések

1. **generate/index.ts** átírása Lovable AI Gateway-re + DB olvasás
2. **useAIModel.ts** hook létrehozása
3. **AIAssistantPanel.tsx** badge dinamikussá tétele
4. Opcionális: külön lektorálási modell beállítás
