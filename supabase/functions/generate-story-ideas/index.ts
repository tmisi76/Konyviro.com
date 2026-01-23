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
    const { genre, subcategory, tone, length, targetAudience, additionalInstructions, authorProfile, previousIdeas } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFiction = genre === "fiction";
    
    // Előző ötletek kizárása az újragenerálásnál
    const previousIdeasClause = previousIdeas?.length > 0 
      ? `\n\nKRITIKUS SZABÁLY - KERÜLD AZ ALÁBBI ÖTLETEKET:\n${previousIdeas.map((t: string, i: number) => `${i+1}. "${t}"`).join('\n')}\n\nGenerálj TELJESEN MÁS témákat, megközelítéseket, címeket és koncepciókat! Az új ötletek NE hasonlítsanak az előzőekre semmilyen módon.`
      : "";

    const systemPrompt = isFiction 
      ? "Te egy kreatív könyvíró asszisztens vagy. Mindig érvényes JSON-t adj vissza."
      : `Te egy bestseller szakértői könyveket író ghostwriter vagy${authorProfile?.authorName ? ` ${authorProfile.authorName} nevében` : ""}. 

SZAKKÖNYV ÍRÁS SZABÁLYOK:
- NE használj kitalált szereplőket vagy fiktív karaktereket
- A szerző első személyben beszél ("Én", "Mi")
- Közvetlen megszólítás ("Te" vagy "Ön" a formalitástól függően)
- Zero fluff - tömör, lényegre törő szöveg
- Minden ígéret mögött konkrét szám vagy példa
- Személyes történetek a hitelesség érdekében
- Gyakorlatias, azonnal alkalmazható tanácsok

Mindig érvényes JSON-t adj vissza.`;
    
    const prompt = isFiction 
      ? `Generálj 3 egyedi sztori ötletet a következő paraméterek alapján:

Műfaj: Fiction
Alkategória: ${subcategory}
Hangnem: ${tone}
Hossz: ${length === "short" ? "rövid (~30k szó)" : length === "medium" ? "közepes (~60k szó)" : "hosszú (~100k szó)"}
${targetAudience ? `Célközönség: ${targetAudience}` : ""}
${additionalInstructions ? `Extra instrukciók: ${additionalInstructions}` : ""}
${previousIdeasClause}

VÁLASZOLJ ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "ideas": [
    {
      "id": "idea-1",
      "title": "Könyv címe",
      "synopsis": "3-4 mondatos szinopszis ami felkelti az érdeklődést",
      "mainElements": ["Elem 1", "Elem 2", "Elem 3"],
      "uniqueSellingPoint": "Mi teszi ezt az ötletet egyedivé és izgalmassá",
      "mood": "A könyv hangulata 2-3 szóban"
    }
  ]
}`
      : `Generálj 3 egyedi SZAKKÖNYV ötletet a következő paraméterek alapján:

Téma: ${subcategory}
Hangnem: ${tone}
Hossz: ${length === "short" ? "rövid (~30k szó, 10 fejezet)" : length === "medium" ? "közepes (~60k szó, 18 fejezet)" : "hosszú (~100k szó, 28 fejezet)"}
${targetAudience ? `Célközönség: ${targetAudience}` : ""}
${authorProfile?.authorBackground ? `Szerző háttere: ${authorProfile.authorBackground}` : ""}
${authorProfile?.mainPromise ? `Fő ígéret: ${authorProfile.mainPromise}` : ""}
${additionalInstructions ? `Extra instrukciók: ${additionalInstructions}` : ""}
${previousIdeasClause}

KÖTELEZŐ KÖNYV ELEMEK (minden ötlethez):
1. NAGY, SPECIFIKUS ÍGÉRET - Konkrét, mérhető eredmény (pl. "7 számjegyű bevétel 12 hónap alatt", "100 új ügyfél 90 nap alatt")
2. EGYEDI MÓDSZERTAN NEVE - Brandelhető keretrendszer (pl. "A Million-Dollar Book Method", "A 4 Lépéses Áttörés Rendszer")
3. 3-5 FŐ FEJEZET TÉMA - A könyv gerincét adó kulcstémák
4. KONKRÉT EREDMÉNY - Mit ér el az olvasó a könyv végére

KÖTELEZŐ STRUKTÚRA MINDEN KÖNYVHÖZ:
- Bevezetés (Miért olvasd el? Mi a probléma?)
- A módszertan bemutatása (Hogyan jött létre? Mi a lényege?)
- Tematikus fejezetek (Lépésről-lépésre útmutató)
- Implementáció (Hogyan kezdj hozzá?)
- Zárás (Következő lépések, CTA)

STÍLUS KÖVETELMÉNYEK:
- Első személy narratíva
- Közvetlen megszólítás
- Rövid bekezdések (max 3-4 mondat)
- Minden fejezethez összefoglaló
- Személyes történetek és esettanulmányok
- Konkrét számok és statisztikák

NE HASZNÁLJ:
- Fiktív karaktereket vagy szereplőket
- Általános, üres ígéreteket ("sikeres leszel", "jobb életed lesz")
- Akadémiai/tudományos stílust
- Hosszú elméleti bevezetéseket

VÁLASZOLJ ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "ideas": [
    {
      "id": "idea-1",
      "title": "Figyelemfelkeltő cím ami tartalmazza az ígéretet",
      "synopsis": "3-4 mondat: Mit tanul meg az olvasó? Milyen konkrét eredményt ér el? Mi az egyedi módszer?",
      "mainElements": ["Kulcstéma 1", "Kulcstéma 2", "Kulcstéma 3"],
      "uniqueSellingPoint": "Az egyedi módszertan neve és a konkrét, mérhető eredmény",
      "mood": "A könyv stílusa 2-3 szóban (pl. gyakorlatias, motiváló, lépésről-lépésre)"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Túl sok kérés" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Nincs kredit" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    if (content.startsWith("```json")) content = content.slice(7);
    if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    
    const ideas = JSON.parse(content.trim());

    return new Response(JSON.stringify(ideas), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
