

# Mesekönyv generálási hiba javítása

## Probléma azonosítása

A `generate-storybook` edge function hibás modell nevet használ: `google/gemini-2.0-flash`. Ez a modell nem létezik a Lovable AI gateway-ben.

**Hibaüzenet a logokból:**
```
invalid model: google/gemini-2.0-flash, allowed models: [openai/gpt-5-mini openai/gpt-5 openai/gpt-5-nano openai/gpt-5.2 google/gemini-2.5-pro google/gemini-2.5-flash google/gemini-2.5-flash-lite google/gemini-2.5-flash-image google/gemini-3-pro-preview google/gemini-3-flash-preview google/gemini-3-pro-image-preview]
```

## Javítási terv

### 1. lepes: Modell frissitese az edge function-ben

**Fajl:** `supabase/functions/generate-storybook/index.ts`

**Valtozas:** A 181. sorban a modell nevet csereljuk `google/gemini-2.0-flash`-rol `google/gemini-3-flash-preview`-ra.

```text
Elotte: model: "google/gemini-2.0-flash"
Utana:  model: "google/gemini-3-flash-preview"
```

**Miert ezt a modellt valasztjuk:**
- Gyors es koltseghatekony
- Kiegyensulyozott kepessegek szoveggenralashoz
- Tokeletesen megfelel gyermekmesek irasahoz

### 2. lepes: Edge function ujra deploy-olasa

A modositas utan ujra deployolni kell a `generate-storybook` edge function-t, hogy az uj modell nev hatassal legyen.

## Technikai reszletek

| Tulajdonsag | Ertek |
|-------------|-------|
| Modositando fajl | `supabase/functions/generate-storybook/index.ts` |
| Modositando sor | 181 |
| Regi ertek | `google/gemini-2.0-flash` |
| Uj ertek | `google/gemini-3-flash-preview` |

## Varható eredmeny

A javitas utan a mesekönyv generalas megfeleloen fog mukodni, es a felhasznalok sikeresen letrehozhatjak a sajat mesekonyveiket.

