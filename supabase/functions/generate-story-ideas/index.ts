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
    const { genre, subcategory, tone, length, targetAudience, additionalInstructions, authorProfile } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFiction = genre === "fiction";
    
    const systemPrompt = isFiction 
      ? "Te egy kreatív könyvíró asszisztens vagy. Mindig érvényes JSON-t adj vissza."
      : `Te egy bestseller szakértői könyveket író ghostwriter vagy${authorProfile?.authorName ? ` ${authorProfile.authorName} nevében` : ""}. NE használj kitalált szereplőket vagy fiktív karaktereket. A szerző első személyben beszél. Mindig érvényes JSON-t adj vissza.`;
    
    const prompt = isFiction 
      ? `Generálj 3 egyedi sztori ötletet a következő paraméterek alapján:

Műfaj: Fiction
Alkategória: ${subcategory}
Hangnem: ${tone}
Hossz: ${length === "short" ? "rövid (~30k szó)" : length === "medium" ? "közepes (~60k szó)" : "hosszú (~100k szó)"}
${targetAudience ? `Célközönség: ${targetAudience}` : ""}
${additionalInstructions ? `Extra instrukciók: ${additionalInstructions}` : ""}

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
Hossz: ${length === "short" ? "rövid (~30k szó)" : length === "medium" ? "közepes (~60k szó)" : "hosszú (~100k szó)"}
${targetAudience ? `Célközönség: ${targetAudience}` : ""}
${authorProfile?.authorBackground ? `Szerző háttere: ${authorProfile.authorBackground}` : ""}
${authorProfile?.mainPromise ? `Fő ígéret: ${authorProfile.mainPromise}` : ""}
${additionalInstructions ? `Extra instrukciók: ${additionalInstructions}` : ""}

FONTOS SZABÁLYOK:
- NE használj kitalált karaktereket vagy fiktív szereplőket
- A könyv a szerző valós tapasztalatain alapul
- Fókuszálj: gyakorlati tanácsok, esettanulmányok, módszerek, lépésről-lépésre útmutatók
- Az olvasó konkrét eredményt ér el a könyv végére

VÁLASZOLJ ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "ideas": [
    {
      "id": "idea-1",
      "title": "Könyv címe",
      "synopsis": "3-4 mondatos leírás arról, mit tanul meg az olvasó",
      "mainElements": ["Kulcstéma 1", "Kulcstéma 2", "Kulcstéma 3"],
      "uniqueSellingPoint": "Mi teszi ezt a könyvet egyedivé a piacon",
      "mood": "A könyv stílusa 2-3 szóban"
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
