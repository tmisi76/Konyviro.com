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
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chapterCount = length === "short" ? 10 : length === "medium" ? 18 : 28;
    const wordsPerChapter = length === "short" ? 3000 : length === "medium" ? 3500 : 4000;

    const prompt = `A következő könyv koncepció alapján készíts egy részletes fejezet struktúrát:

${concept}

Készíts pontosan ${chapterCount} fejezetet. Minden fejezethez add meg:
- Kreatív, figyelemfelkeltő cím
- 2-3 mondatos leírás a fejezet tartalmáról
- 3-5 kulcspont/esemény ami történik
- Becsült szóhossz (~${wordsPerChapter} szó/fejezet)

VÁLASZOLJ ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "chapters": [
    {
      "id": "ch-1",
      "number": 1,
      "title": "Fejezet címe",
      "description": "2-3 mondatos leírás",
      "keyPoints": ["Pont 1", "Pont 2", "Pont 3"],
      "estimatedWords": ${wordsPerChapter}
    },
    ...
  ]
}

A fejezetek:
- Logikus sorrendben kövessék egymást
- Építsék fel a feszültséget/tartalmat
- Legyenek a címek kreatívak és utalók`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Te egy professzionális könyvszerkesztő vagy. Mindig érvényes JSON-t adj vissza." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    if (content.startsWith("```json")) content = content.slice(7);
    if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    
    const chapters = JSON.parse(content.trim());

    return new Response(JSON.stringify(chapters), {
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
