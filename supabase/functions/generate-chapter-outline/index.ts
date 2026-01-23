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

    // Retry logic exponenciális backoff-al (429/502/503 kezelés)
    const maxRetries = 5;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], max_tokens: 4000 }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429 || response.status === 502 || response.status === 503) {
          console.error(`Status ${response.status} (attempt ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
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

    if (!response || !response.ok) {
      if (response?.status === 429) return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response?.status || "unknown"}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    if (!content) {
      console.error("Empty AI response");
      throw new Error("Üres AI válasz");
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
    
    // Null értékek kiszűrése a fejezetekből
    parsedResponse.chapters = parsedResponse.chapters.filter(
      (ch: unknown) => ch !== null && ch !== undefined && typeof ch === 'object'
    );
    
    console.log(`Returning ${parsedResponse.chapters.length} chapters`);
    
    return new Response(JSON.stringify(parsedResponse), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Generate chapter outline error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
