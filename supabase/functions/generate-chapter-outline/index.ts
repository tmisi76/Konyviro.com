import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], max_tokens: 4000 }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Túl sok kérés" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    if (content.startsWith("```json")) content = content.slice(7);
    if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    
    return new Response(JSON.stringify(JSON.parse(content.trim())), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
