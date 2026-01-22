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
    const { genre, subcategory, tone, length, targetAudience, additionalInstructions } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFiction = genre === "fiction";
    const prompt = `Generálj 3 egyedi ${isFiction ? "sztori" : "könyv"} ötletet a következő paraméterek alapján:

Műfaj: ${isFiction ? "Fiction" : "Szakkönyv"}
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
    },
    ...
  ]
}

Az ötletek legyenek:
- Egyediek és kreatívak
- A műfajhoz és alkategóriához illeszkedők
- Potenciálisan bestseller minőségűek
- Egymástól jelentősen különbözők`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Te egy kreatív könyvíró asszisztens vagy. Mindig érvényes JSON-t adj vissza." },
          { role: "user", content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Clean JSON from markdown
    if (content.startsWith("```json")) content = content.slice(7);
    if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    
    const ideas = JSON.parse(content.trim());

    return new Response(JSON.stringify(ideas), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
