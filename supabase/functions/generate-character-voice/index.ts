import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const SYSTEM_PROMPT = `Te egy karakterfejlesztési szakértő és író vagy. A feladatod, hogy egy karakter adatlapja alapján készíts egy részletes "character voice" (karakterhang) leírást, amit egy AI író fel tud használni a párbeszédek és a narráció megírásához.

A VÁLASZOD KÖTELEZŐEN ÉRVÉNYES JSON FORMÁTUMBAN LEGYEN:
{
  "character_voice": "Részletes leírás a karakter hangjáról, gondolkodásmódjáról, szókincséről, mondatszerkezeteiről és egy példa párbeszéd."
}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const character = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY nincs konfigurálva" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const userPrompt = `Karakter Adatlap:
- Név: ${character.name}
- Szerep: ${character.role}
- Kor: ${character.age}
- Foglalkozás: ${character.occupation}
- Pozitív tulajdonságok: ${character.positiveTraits?.join(", ") || "N/A"}
- Negatív tulajdonságok: ${character.negativeTraits?.join(", ") || "N/A"}
- Háttértörténet: ${character.backstory || "N/A"}
- Motiváció: ${character.motivation || "N/A"}

Feladat: Készíts részletes "character voice" leírást a fenti adatok alapján. A leírás térjen ki a következőkre:
1.  **Szókincs és Stílus:** Milyen szavakat használ? (pl. szleng, formális, tudományos, egyszerű)
2.  **Mondatszerkezetek:** Hosszú, körmönfont mondatokat használ, vagy rövid, tőmondatokat?
3.  **Gondolkodásmód:** Hogyan látja a világot? (pl. optimista, cinikus, analitikus, érzelmes)
4.  **Beszédtempó és Ritmus:** Gyorsan, lassan, szaggatottan beszél?
5.  **Példa Párbeszéd:** Írj egy 2-3 váltásos párbeszédet, ami bemutatja a karakter hangját egy tipikus helyzetben.

CSAK a JSON választ add vissza.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ 
        model: "google/gemini-3-flash-preview", 
        max_tokens: 2048,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error("AI API hiba");
    }

    const data = await response.json();
    const voiceData = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    return new Response(JSON.stringify(voiceData), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("generate-character-voice error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
