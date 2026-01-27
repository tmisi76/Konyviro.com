
## Probléma Diagnózisa

A mesekönyv generálás közben a 3. oldal illusztrációjánál timeout hiba történt. A logokból látszik:
- Az edge function sikeresen generálta és feltöltötte a képet
- Viszont a böngésző bezárta a kapcsolatot mielőtt a válasz megérkezett volna ("connection closed before message completed")
- Ez azért történt, mert az AI képgenerálás ~60-120 másodpercig tarthat, ami túllépi a Supabase SDK alapértelmezett timeoutját

## Megoldási Terv

### 1. Supabase Function Invoke Timeout Növelése

**Fájl:** `src/hooks/useStorybookWizard.ts`

A `generateIllustration` függvényben növeljük a timeout értéket a Supabase invoke hívásnál. Sajnos a Supabase JS SDK nem támogatja közvetlenül a timeout beállítást az `invoke` híváskor, ezért át kell alakítani a hívást natív `fetch`-re AbortController-rel:

```typescript
const generateIllustration = useCallback(async (
  pageId: string,
  pageData?: StorybookPage
): Promise<boolean> => {
  // ... meglévő kód ...
  
  try {
    // Használjunk natív fetch-et 3 perces timeouttal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 perc
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-storybook-illustration`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          prompt: page.illustrationPrompt,
          style: data.illustrationStyle,
          characters: data.characters,
          pageNumber: page.pageNumber,
        }),
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    const responseData = await response.json();
    // ... folytatás ...
  } catch (error) {
    // ... hibakezelés ...
  }
}, [/* deps */]);
```

### 2. Robusztusabb Hibakezelés

**Fájl:** `src/hooks/useStorybookWizard.ts`

A `generateAllIllustrations` függvényben ne álljon le az első hibánál, hanem folytassa a többi oldalt és gyűjtse össze a hibákat:

```typescript
const generateAllIllustrations = useCallback(async (
  onProgress?: (current: number, total: number) => void
): Promise<boolean> => {
  const currentPages = pagesRef.current;
  
  if (currentPages.length === 0) {
    toast.error("Nem találok oldalakat a képgeneráláshoz.");
    return false;
  }
  
  const pagesToGenerate = currentPages.filter(p => !p.illustrationUrl);
  const total = pagesToGenerate.length;
  
  if (total === 0) {
    return true;
  }
  
  let successCount = 0;
  const failedPages: string[] = [];
  
  for (let i = 0; i < pagesToGenerate.length; i++) {
    const page = pagesToGenerate[i];
    onProgress?.(i + 1, total);
    
    const success = await generateIllustration(page.id, page);
    
    if (success) {
      successCount++;
    } else {
      failedPages.push(`${page.pageNumber}. oldal`);
    }
    
    // Késleltetés a rate limiting elkerülésére
    if (i < pagesToGenerate.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 mp-re növelve
    }
  }
  
  // Ha legalább néhány sikerült, engedjük tovább
  if (successCount > 0 && failedPages.length > 0) {
    toast.warning(`${failedPages.length} illusztráció nem készült el: ${failedPages.join(", ")}`);
    return true; // Engedjük folytatni
  }
  
  return successCount === total;
}, [generateIllustration]);
```

### 3. Retry Logika az Edge Functionben

**Fájl:** `supabase/functions/generate-storybook-illustration/index.ts`

Adjunk hozzá retry logikát az AI híváshoz, ha timeout vagy átmeneti hiba történik:

```typescript
// Retry logika az AI híváshoz
let aiData = null;
const maxRetries = 2;

for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { /* ... */ },
      body: JSON.stringify({ /* ... */ }),
    });

    if (aiResponse.ok) {
      aiData = await aiResponse.json();
      break;
    }
    
    if (aiResponse.status === 429 && attempt < maxRetries) {
      // Rate limit - várjunk és próbáljuk újra
      await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
      continue;
    }
    
    // Más hiba
    throw new Error(`AI generation failed: ${aiResponse.status}`);
  } catch (err) {
    if (attempt === maxRetries) throw err;
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
```

### 4. UI Javítás - "Folytatás hiányos képekkel" Opció

**Fájl:** `src/components/storybook/steps/StorybookGenerateStep.tsx`

A hiba képernyőn már van "Folytatás az előnézethez" gomb, de javítsuk a logikát:

```typescript
// A handleContinueWithErrors függvényt módosítsuk
const handleContinueWithErrors = () => {
  // Ellenőrizzük, hogy van-e legalább néhány sikeres oldal
  const successfulPages = data.pages.filter(p => p.illustrationUrl);
  
  if (successfulPages.length > 0) {
    setPhase("complete");
  } else {
    toast.error("Legalább egy illusztrációnak el kell készülnie a folytatáshoz.");
  }
};
```

## Érintett Fájlok

1. `src/hooks/useStorybookWizard.ts` - Timeout növelés és robusztusabb hibakezelés
2. `supabase/functions/generate-storybook-illustration/index.ts` - Retry logika
3. `src/components/storybook/steps/StorybookGenerateStep.tsx` - UI javítások

## Technikai Részletek

- Az AI képgenerálás akár 60-120 másodpercig is tarthat karakterekkel
- A Supabase JS SDK alapértelmezetten ~60 másodperces timeoutot használ
- A megoldás: natív fetch 3 perces timeouttal az edge function híváshoz
- A retry logika segít az átmeneti hibák kezelésében
- A "continue with errors" opció lehetővé teszi, hogy a felhasználó használja a sikeresen elkészült illusztrációkat
