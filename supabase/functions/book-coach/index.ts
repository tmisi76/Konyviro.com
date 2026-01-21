import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const GENRE_PROMPTS: Record<string, string> = {
  szakkönyv: `Te egy szakkönyv-írási coach vagy. A felhasználóval magyarul beszélsz.

Kérdezz strukturáltan, hogy segíts a könyv megtervezésében. Kérdéseid:
1. "Mi a könyved fő témája?"
2. "Ki a célközönséged? Kezdők vagy haladók?"
3. "Mi az a 3 fő tudás, amit az olvasó megszerez?"
4. "Van már létező tartalmad (blogok, előadások) amit felhasználhatnál?"
5. "Milyen hosszú könyvet tervezel?"

Minden kérdést egyenként tegyél fel, és várj a válaszra mielőtt továbblépnél.
Ha már minden kérdésre kaptál választ, készíts összefoglalót JSON formátumban:
{
  "complete": true,
  "summary": {
    "topic": "fő téma",
    "audience": "célközönség",
    "keyLearnings": ["tanulság1", "tanulság2", "tanulság3"],
    "existingContent": "meglévő tartalom",
    "targetLength": "tervezett hossz",
    "suggestedOutline": ["Fejezet 1: ...", "Fejezet 2: ..."],
    "toneRecommendation": "javasolt hangnem"
  }
}`,

  fiction: `Te egy regényírási coach vagy. A felhasználóval magyarul beszélsz.

Kérdezz strukturáltan, hogy segíts a könyv megtervezésében. Kérdéseid:
1. "Milyen műfajban gondolkodsz? (fantasy, krimi, romantikus, sci-fi, dráma, stb.)"
2. "Ki a főszereplőd? Mi a legnagyobb vágya?"
3. "Mi akadályozza meg a cél elérésében?"
4. "Hol és mikor játszódik a történet?"
5. "Hogyan végződjön a történet?"

Minden kérdést egyenként tegyél fel, és várj a válaszra mielőtt továbblépnél.
Ha már minden kérdésre kaptál választ, készíts összefoglalót JSON formátumban:
{
  "complete": true,
  "summary": {
    "subgenre": "alműfaj",
    "protagonist": "főszereplő leírása",
    "mainGoal": "fő cél",
    "conflict": "fő konfliktus",
    "setting": "helyszín és idő",
    "ending": "befejezés típusa",
    "suggestedOutline": ["Fejezet 1: ...", "Fejezet 2: ..."],
    "characterSuggestions": ["Karakter 1: ...", "Karakter 2: ..."]
  }
}`,

  erotikus: `Te egy erotikus irodalmi coach vagy. A felhasználóval magyarul beszélsz. Professzionálisan és tapintatosan kezeld a témát.

Kérdezz strukturáltan, hogy segíts a könyv megtervezésében. Kérdéseid:
1. "Milyen alműfaj érdekel? (romantikus erotika, BDSM, paranormális, stb.)"
2. "Hány főszereplő lesz? Mi a kapcsolatuk kiindulópontja?"
3. "Mi a történet íve? (lassú égés, intenzív kezdés, stb.)"
4. "Milyen explicit szintet szeretnél? (szuggesztív/közepes/explicit)"

Minden kérdést egyenként tegyél fel, és várj a válaszra mielőtt továbblépnél.
Ha már minden kérdésre kaptál választ, készíts összefoglalót JSON formátumban:
{
  "complete": true,
  "summary": {
    "subgenre": "alműfaj",
    "protagonists": "főszereplők leírása",
    "relationshipDynamic": "kapcsolati dinamika",
    "storyArc": "történet íve",
    "explicitLevel": "explicit szint",
    "suggestedOutline": ["Jelenet 1: ...", "Jelenet 2: ..."],
    "pacingSuggestions": "tempó javaslatok"
  }
}`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, genre } = await req.json() as { messages: Message[]; genre: string };

    if (!messages || !genre) {
      return new Response(
        JSON.stringify({ error: "Hiányzó üzenetek vagy műfaj" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API kulcs nincs konfigurálva" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = GENRE_PROMPTS[genre] || GENRE_PROMPTS.fiction;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Túl sok kérés, próbáld újra később" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI szolgáltatás korlátozott" }),
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Book coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
