import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { repairAndParseJSON } from "../_shared/json-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { genre, length, concept } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const chapterCount = length === "short" ? 10 : length === "medium" ? 18 : 28;
    const wordsPerChapter = length === "short" ? 3000 : length === "medium" ? 3500 : 4000;
    
    const isFiction = genre === "fiction";

    const systemPrompt = isFiction 
      ? "Te egy professzionális könyvszerkesztő vagy. Mindig érvényes JSON-t adj vissza."
      : `Te egy bestseller szakkönyveket strukturáló szerkesztő vagy.

KÖTELEZŐ FEJEZET STRUKTÚRA SZAKKÖNYVHÖZ:

1. BEVEZETÉS (1 fejezet)
   - A könyv célja és ígérete
   - Kinek szól ez a könyv?
   - Milyen problémákat old meg?
   - Mit kap az olvasó?

2. A MÓDSZERTAN BEMUTATÁSA (1-2 fejezet)
   - Személyes történet: hogyan jött létre a módszer
   - A keretrendszer/módszer áttekintése
   - A főbb lépések összefoglalása

3. TEMATIKUS FEJEZETEK (${Math.floor(chapterCount * 0.6)} fejezet)
   Minden fejezet tartalmazza:
   - Probléma azonosítása
   - Megoldás lépésről-lépésre
   - Gyakorlati példák/esettanulmányok
   - Kulcspontok összefoglalója

4. IMPLEMENTÁCIÓ (1-2 fejezet)
   - Hogyan kezdj hozzá azonnal
   - Konkrét akciólépések
   - Gyakori hibák és elkerülésük

5. ZÁRÁS (1 fejezet)
   - Eredmények összegzése
   - Következő lépések
   - CTA (hogyan dolgozhatunk együtt)

STÍLUS SZABÁLYOK:
- Első személy narratíva ("Én", "Mi")
- Rövid bekezdések
- Minden fejezet végén összefoglaló
- Konkrét számok és példák
- Zero fluff - semmi töltelék

Mindig érvényes JSON-t adj vissza.`;

    const prompt = isFiction 
      ? `A következő könyv koncepció alapján készíts egy részletes fejezet struktúrát:

${concept}

Készíts pontosan ${chapterCount} fejezetet.

VÁLASZOLJ JSON FORMÁTUMBAN:
{"chapters": [{"id": "ch-1", "number": 1, "title": "Cím", "description": "Leírás", "keyPoints": ["..."], "estimatedWords": ${wordsPerChapter}}]}`
      : `A következő SZAKKÖNYV koncepció alapján készíts részletes fejezet struktúrát:

${concept}

Készíts pontosan ${chapterCount} fejezetet a KÖTELEZŐ STRUKTÚRA szerint:
- 1 Bevezetés fejezet
- 1-2 Módszertan fejezet
- ${Math.floor(chapterCount * 0.6)} Tematikus fejezet
- 1-2 Implementáció fejezet
- 1 Záró fejezet

Minden fejezethez add meg:
- Egyértelmű, cselekvésre ösztönző cím
- 2-3 mondatos leírás a fejezet tartalmáról
- 3-5 kulcspont amit az olvasó megtanul
- Fejezet típus (introduction/methodology/topic/implementation/closing)

VÁLASZOLJ JSON FORMÁTUMBAN:
{
  "chapters": [
    {
      "id": "ch-1",
      "number": 1,
      "title": "BEVEZETÉS: Miért Fontos Ez a Könyv",
      "description": "A könyv célja, az olvasó problémáinak azonosítása, és az ígéret megfogalmazása.",
      "keyPoints": ["A fő probléma bemutatása", "Mit kapsz ebből a könyvből", "Hogyan használd a könyvet"],
      "estimatedWords": ${wordsPerChapter},
      "chapterType": "introduction"
    }
  ]
}`;

    // Rock-solid retry logic with max resilience
    const maxRetries = 7;
    const MAX_TIMEOUT = 120000; // 2 minutes
    let content = "";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT);

        console.log(`AI request attempt ${attempt}/${maxRetries}`);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ 
            model: "google/gemini-3-flash-preview", 
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], 
            max_tokens: 8192 // INCREASED for maximum response length
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limit and gateway errors
        if (response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504) {
          console.error(`Status ${response.status} (attempt ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          throw new Error("AI szolgáltatás nem elérhető");
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Response not ok: ${response.status}`, errorText.substring(0, 200));
          
          // Retry on 5xx errors
          if (response.status >= 500 && attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("AI hiba");
        }

        // Parse response safely
        let aiData;
        try {
          aiData = await response.json();
        } catch (parseError) {
          console.error(`JSON parse error (attempt ${attempt}/${maxRetries}):`, parseError);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Hibás API válasz formátum");
        }

        content = aiData.choices?.[0]?.message?.content || "";

        // Retry on empty or too short response (minimum 50 chars for valid chapters)
        if (!content || content.trim().length < 50) {
          console.warn(`Empty/too short AI response (attempt ${attempt}/${maxRetries}), length: ${content?.length || 0}`);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Az AI nem tudott megfelelő választ generálni");
        }

        // Success - exit retry loop
        console.log(`AI response received, length: ${content.length}`);
        break;

      } catch (fetchError) {
        console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw fetchError;
      }
    }
    
    console.log("Raw AI response length:", content.length);
    
    // Robusztus JSON parse a json-utils-szal
    let parsedResponse: { chapters?: unknown[] };
    try {
      parsedResponse = repairAndParseJSON<{ chapters?: unknown[] }>(content);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw content (first 500 chars):", content.substring(0, 500));
      throw new Error("Hiba a fejezet struktúra feldolgozása közben");
    }
    
    // Validáljuk a chapters tömböt
    if (!parsedResponse.chapters || !Array.isArray(parsedResponse.chapters)) {
      console.error("Invalid chapters format:", parsedResponse);
      throw new Error("Érvénytelen fejezet formátum");
    }
    
    // Null értékek kiszűrése és validálás - kötelező mezők ellenőrzése
    const validChapters = parsedResponse.chapters
      .filter((ch: unknown): ch is Record<string, unknown> => 
        ch !== null && 
        ch !== undefined && 
        typeof ch === 'object' &&
        'title' in ch
      )
      .map((ch, index) => ({
        id: ch.id || `ch-${index + 1}`,
        number: typeof ch.number === 'number' ? ch.number : index + 1,
        title: String(ch.title || `Fejezet ${index + 1}`),
        description: String(ch.description || ""),
        keyPoints: Array.isArray(ch.keyPoints) ? ch.keyPoints : [],
        estimatedWords: typeof ch.estimatedWords === 'number' ? ch.estimatedWords : wordsPerChapter,
        chapterType: ch.chapterType || "topic",
      }));

    if (validChapters.length === 0) {
      console.error("No valid chapters after filtering");
      throw new Error("Nem sikerült érvényes fejezeteket generálni");
    }
    
    console.log(`Returning ${validChapters.length} valid chapters`);
    
    return new Response(JSON.stringify({ chapters: validChapters }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Generate chapter outline error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
