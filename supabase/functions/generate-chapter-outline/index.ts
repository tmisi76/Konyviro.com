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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chapterCount = length === "short" ? 10 : length === "medium" ? 18 : 28;
    const wordsPerChapter = length === "short" ? 3000 : length === "medium" ? 3500 : 4000;

    const systemPrompt = "Te egy professzionális könyvszerkesztő vagy. Mindig érvényes JSON-t adj vissza.";

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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiData = await response.json();
    let content = aiData.content?.[0]?.text || "";
    
    if (content.startsWith("```json")) content = content.slice(7);
    if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    
    const chapters = JSON.parse(content.trim());

    return new Response(JSON.stringify(chapters), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
