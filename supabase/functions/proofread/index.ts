import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, language = "hu" } = await req.json();

    if (!text || text.trim().length < 10) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI (Gemini)
    const prompt = `Te egy professzionális ${language === "hu" ? "magyar" : "angol"} nyelvű lektor vagy.

Elemezd a következő szöveget és adj javaslatokat az alábbi kategóriákban:
- grammar (nyelvtani hibák)
- spelling (helyesírási hibák)
- style (stilisztikai javítások)
- punctuation (írásjelek)

Válaszolj CSAK JSON formátumban, a következő struktúrában:
{
  "suggestions": [
    {
      "original": "hibás szövegrész",
      "suggestion": "javított szövegrész",
      "type": "grammar|spelling|style|punctuation",
      "explanation": "rövid magyarázat"
    }
  ]
}

Ha nincs hiba, válaszolj: {"suggestions": []}

Szöveg:
"""
${text.slice(0, 5000)}
"""`;

    const aiResponse = await fetch("https://qdyneottmnulmkypzmtt.supabase.co/functions/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.get("Authorization") || "",
      },
      body: JSON.stringify({
        prompt,
        type: "proofread",
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const responseText = aiData?.text || aiData?.content || "{}";

    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: [] };
    } catch {
      parsed = { suggestions: [] };
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Proofread error:", error);
    return new Response(
      JSON.stringify({ error: error.message, suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
