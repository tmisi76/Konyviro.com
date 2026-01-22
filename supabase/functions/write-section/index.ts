import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Section type specific prompts
const SECTION_PROMPTS: Record<string, string> = {
  intro: `Ez egy BEVEZETŐ szekció. Szabályok:
- Kezdj egy gondolatébresztő kérdéssel vagy meglepő ténnyel
- Mutasd be, miért fontos ez a téma az olvasónak
- Váltsd ki az olvasó kíváncsiságát
- Vezesd be a fejezet fő témáit
- NE adj még definíciókat vagy mély magyarázatokat`,

  concept: `Ez egy FOGALOM MAGYARÁZÓ szekció. Szabályok:
- Adj világos, pontos definíciókat
- Magyarázd el az elméleti alapokat
- Használj analógiákat a megértéshez
- Építs az egyszerűbből a bonyolultabb felé
- Hivatkozz szakirodalomra ahol releváns`,

  example: `Ez egy PÉLDA szekció. Szabályok:
- Adj konkrét, valós életből vett példákat
- Mutasd be lépésről lépésre a folyamatot
- Használj specifikus számokat és adatokat
- Tedd személyessé és relatívvá az olvasó számára
- Kapcsold össze az elméleti fogalmakkal`,

  exercise: `Ez egy GYAKORLAT szekció. Szabályok:
- Adj világos, megoldható feladatokat
- Fokozatosan növekvő nehézség
- Minden feladathoz adj útmutatást
- Ösztönözd az aktív gondolkodást
- Adj lehetőséget az önellenőrzésre`,

  summary: `Ez egy ÖSSZEFOGLALÓ szekció. Szabályok:
- Sorold fel a kulcspontokat tömören
- Emeld ki a legfontosabb tanulságokat
- Adj gyakorlati alkalmazási tippeket
- Készítsd elő a következő fejezetet
- Zárd inspiráló gondolattal`,

  case_study: `Ez egy ESETTANULMÁNY szekció. Szabályok:
- Írj le egy valós vagy realisztikus szituációt
- Mutasd be a kontextust és a szereplőket
- Elemezd a döntéseket és következményeket
- Vonj le tanulságokat
- Kapcsold az elméleti fogalmakhoz`,
};

const SYSTEM_PROMPT = `Te egy tapasztalt szakkönyv szerző vagy. Feladatod, hogy a megadott szekció-vázlat alapján megírd a szekció teljes szövegét.

ÁLTALÁNOS ÍRÁSI SZABÁLYOK:
- Világos, logikus struktúra
- Magyarázd el a szakkifejezéseket első használatkor
- Didaktikus, de olvasmányos stílus
- Használj bekezdéseket a szöveg tagolására
- A szekció hossza közelítsen a target_words értékhez
- Magyar nyelven írj, szakmai de közérthető stílusban
- Az olvasót tegezd vagy önözd következetesen (inkább tegezd)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      projectId, 
      chapterId,
      sectionNumber,
      sectionOutline,
      previousContent,
      bookTopic,
      targetAudience,
      chapterTitle
    } = await req.json();

    if (!projectId || !chapterId || !sectionOutline) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get section type specific prompt
    const sectionType = sectionOutline.pov || sectionOutline.type || "concept";
    const typePrompt = SECTION_PROMPTS[sectionType] || SECTION_PROMPTS.concept;

    let userPrompt = `ÍRD MEG AZ ALÁBBI SZEKCIÓT:

FEJEZET: ${chapterTitle}
SZEKCIÓ #${sectionNumber}: "${sectionOutline.title}"

SZEKCIÓ TÍPUS: ${sectionType}
${typePrompt}

SZEKCIÓ RÉSZLETEI:
- Tanulási cél: ${sectionOutline.description || sectionOutline.learning_objective}
- Kulcspontok: ${(sectionOutline.key_events || sectionOutline.key_points || []).join(", ")}
- Szükséges példák száma: ${sectionOutline.emotional_arc?.includes("Példák:") ? sectionOutline.emotional_arc.replace("Példák:", "").trim() : "1-2"}
- Célhossz: ~${sectionOutline.target_words} szó

KÖNYV KONTEXTUS:
- Téma: ${bookTopic || "Általános szakkönyv"}
- Célközönség: ${targetAudience || "Általános olvasóközönség"}
`;

    if (previousContent) {
      userPrompt += `
AZ EDDIGI TARTALOM (folytatásként írd):
---
${previousContent}
---
`;
    }

    userPrompt += `
Most írd meg ezt a szekciót! A válasz CSAK a szekció szövege legyen, semmi más megjegyzés vagy formázás.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: Math.min(sectionOutline.target_words * 2, 6000),
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Túl sok kérés. Kérlek várj." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredit elfogyott." }),
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

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Write section error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
