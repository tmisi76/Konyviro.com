import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Te egy bestseller könyvek szerzője és történetírás szakértő vagy. A felhasználó ad neked egy egyszerű sztori ötletet, és te ebből készítesz egy részletes, izgalmas történet vázlatot.

KÖVETELMÉNYEK:
1. **Izgalmas nyitás** - Hook ami azonnal megfogja az olvasót
2. **Komplex főszereplő** - Belső konfliktussal és karakterívvel
3. **Legalább 3-5 váratlan fordulat** - Meglepő, de logikus események
4. **Fokozódó feszültség** - Minden fejezet emelje a tétet
5. **Érzelmi mélység** - Karakterek akikkel azonosulni lehet
6. **Kielégító befejezés** - Meglepő de értelmes lezárás

BESTSELLER TECHNIKÁK:
- Háromlépcsős struktúra (setup, confrontation, resolution)
- "Save the Cat" beat-ek használata
- Show, don't tell elv
- Cliffhangerek a fejezetek végén
- Szub-plotok a főszereplő mellett

A VÁLASZOD KÖTELEZŐEN ÉRVÉNYES JSON FORMÁTUMBAN LEGYEN (és semmi más):
{
  "title": "Javasolt könyv cím",
  "logline": "Egy mondatos, hook-szerű összefoglaló (max 30 szó)",
  "synopsis": "3-5 bekezdéses részletes szinopszis a teljes történetről",
  "protagonist": {
    "name": "Főszereplő neve",
    "age": "Kor (opcionális)",
    "description": "Rövid leírás",
    "innerConflict": "Belső konfliktus amivel küzd",
    "arc": "Hogyan változik a történet végére"
  },
  "antagonist": {
    "name": "Ellenfél neve vagy a konfliktus forrása",
    "description": "Leírás és motiváció"
  },
  "setting": "Helyszín és időszak részletes leírása",
  "themes": ["Fő téma 1", "Fő téma 2", "Fő téma 3"],
  "plotPoints": [
    {"beat": "Opening Hook", "description": "A történet megragadó kezdése"},
    {"beat": "Inciting Incident", "description": "Az esemény ami elindítja a cselekményt"},
    {"beat": "First Plot Point", "description": "A főszereplő belép az új világba"},
    {"beat": "Rising Action", "description": "Kihívások és akadályok"},
    {"beat": "Midpoint Twist", "description": "Nagy fordulat a történet közepén"},
    {"beat": "Dark Night of Soul", "description": "A főszereplő legmélyebb pontja"},
    {"beat": "Climax", "description": "A végső összecsapás"},
    {"beat": "Resolution", "description": "A lezárás és új egyensúly"}
  ],
  "chapters": [
    {"number": 1, "title": "Fejezet címe", "summary": "1 mondatos összefoglaló"}
  ]
}

FONTOS:
- Maximum 8-10 fejezetet javasolj rövid összefoglalókkal
- Minden fejezet címe legyen kreatív és utaljon a tartalomra
- A fejezet összefoglalók legyenek konkrétak, ne általánosak
- A válasz CSAK a JSON legyen, semmi más szöveg
- Magyar nyelven válaszolj`;

const EROTIC_ADDON = `

EROTIKUS TARTALOM IRÁNYELVEK:
- Az intim jelenetek legyenek a történet szerves részei
- Építsd az érzelmi és fizikai intimitást fokozatosan
- A karakterek közti kémia és vonzalom legyen hiteles
- Figyelj a beleegyezés és tisztelet ábrázolására
- Az explicit tartalom szolgálja a karakter-fejlődést`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storyIdea, genre, tone, targetAudience } = await req.json();

    if (!storyIdea || storyIdea.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Kérlek adj meg egy részletesebb sztori ötletet (legalább 10 karakter)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI szolgáltatás nincs konfigurálva" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the system prompt based on genre
    let systemPrompt = SYSTEM_PROMPT;
    if (genre === "erotikus") {
      systemPrompt += EROTIC_ADDON;
    }

    // Build context for the prompt
    const contextParts: string[] = [];
    if (genre) {
      const genreNames: Record<string, string> = {
        fiction: "Szépirodalmi regény",
        erotikus: "Erotikus regény",
        szakkonyv: "Szakkönyv"
      };
      contextParts.push(`Műfaj: ${genreNames[genre] || genre}`);
    }
    if (tone) {
      const toneNames: Record<string, string> = {
        formal: "Formális",
        direct: "Közvetlen",
        friendly: "Barátságos",
        provocative: "Provokatív"
      };
      contextParts.push(`Hangnem: ${toneNames[tone] || tone}`);
    }
    if (targetAudience) {
      const audienceNames: Record<string, string> = {
        beginner: "Kezdő olvasók",
        intermediate: "Átlagos olvasók",
        expert: "Tapasztalt olvasók",
        general: "Általános közönség"
      };
      contextParts.push(`Célközönség: ${audienceNames[targetAudience] || targetAudience}`);
    }

    const userPrompt = `${contextParts.length > 0 ? contextParts.join("\n") + "\n\n" : ""}SZTORI ÖTLET:
${storyIdea}

Készíts ebből egy részletes, bestseller-minőségű történet vázlatot a megadott JSON formátumban!`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second timeout

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 6000, // Reduced to get faster response
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "A generálás túl sokáig tartott. Próbáld újra rövidebb ötlettel." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Túl sok kérés. Kérlek várj egy kicsit és próbáld újra." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Nincs elég kredit. Kérlek töltsd fel az egyenleged." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI szolgáltatás hiba" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Nem sikerült választ generálni" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the response
    // Sometimes the AI wraps it in markdown code blocks
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    // Fix common JSON issues from AI responses
    // Remove trailing commas before closing brackets/braces
    jsonContent = jsonContent.replace(/,(\s*[\]}])/g, '$1');
    // Remove any control characters that might cause issues
    jsonContent = jsonContent.replace(/[\x00-\x1F\x7F]/g, (char: string) => {
      if (char === '\n' || char === '\r' || char === '\t') return char;
      return '';
    });

    let storyData;
    try {
      storyData = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", jsonContent.substring(0, 500));
      
      // Try to extract just the essential data if JSON is malformed
      try {
        // Attempt to find and parse a valid JSON object
        const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const cleanedJson = jsonMatch[0].replace(/,(\s*[\]}])/g, '$1');
          storyData = JSON.parse(cleanedJson);
        } else {
          throw new Error("No JSON object found");
        }
      } catch (retryError) {
        console.error("JSON retry parse error:", retryError);
        return new Response(
          JSON.stringify({ error: "Nem sikerült feldolgozni a generált sztorit. Próbáld újra." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate required fields
    if (!storyData.title || !storyData.synopsis || !storyData.chapters) {
      return new Response(
        JSON.stringify({ error: "Hiányos sztori generálás. Próbáld újra." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(storyData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate story error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
