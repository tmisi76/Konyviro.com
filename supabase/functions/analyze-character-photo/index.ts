import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CharacterProfile {
  gender?: string;
  age?: string;
  hairColor?: string;
  hairStyle?: string;
  eyeColor?: string;
  clothing?: string;
  distinguishingFeatures?: string;
  fullDescription?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Step 1: Analyze the image with multimodal AI
    const analysisPrompt = `Elemezd a képen látható személyt, és add vissza a következő attribútumokat JSON formátumban:
- gender: nem (pl. 'kislány', 'kisfiú', 'nő', 'férfi')
- age: becsült kor (pl. 'kb. 5 éves', 'kb. 8 éves')
- hairColor: hajszín (pl. 'szőke', 'barna', 'fekete', 'vörös')
- hairStyle: hajstílus (pl. 'rövid', 'hosszú, egyenes', 'göndör, copfos')
- eyeColor: szemszín (pl. 'kék', 'barna', 'zöld')
- clothing: ruházat leírása (pl. 'piros póló és kék farmer')
- distinguishingFeatures: megkülönböztető jegyek (pl. 'szeplős orr', 'nagy mosoly', 'szemüveges')

FONTOS: Csak a tiszta JSON objektumot add vissza, semmi mást. Ne használj markdown formázást.`;

    console.log("Analyzing image:", imageUrl);

    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: analysisPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!analysisResponse.ok) {
      if (analysisResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Túl sok kérés, kérlek próbáld újra később." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (analysisResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Nincs elegendő kredit." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await analysisResponse.text();
      console.error("AI analysis error:", analysisResponse.status, errorText);
      throw new Error(`AI analysis failed: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const analysisContent = analysisData.choices?.[0]?.message?.content || "";
    
    console.log("Raw analysis response:", analysisContent);

    // Parse the JSON from the response
    let profile: CharacterProfile = {};
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedContent = analysisContent.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();
      
      profile = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse analysis JSON:", parseError, analysisContent);
      // Try to extract what we can with a fallback approach
      profile = {
        gender: "ismeretlen",
        age: "ismeretlen",
        hairColor: "ismeretlen",
        hairStyle: "ismeretlen",
        eyeColor: "ismeretlen",
        clothing: "ismeretlen",
        distinguishingFeatures: "nincs",
      };
    }

    // Step 2: Generate detailed description based on the profile
    const descriptionPrompt = `A következő JSON adatok alapján írj egy rövid, de részletes, leíró bekezdést egy mesekönyv karakterhez, ami segít egy illusztrátornak konzisztensen megrajzolni a karaktert:

${JSON.stringify(profile, null, 2)}

A leírás legyen élénk és vizuális. Például: "Lili egy 5 év körüli kislány, szőke, vállig érő hajjal és ragyogó kék szemekkel. Általában egy vidám, piros pólót visel. Legjellegzetesebb vonása a szeplős orra."

FONTOS: Csak a leírást add vissza, semmi mást. Ne használj idézőjeleket a válasz elején és végén.`;

    const descriptionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: descriptionPrompt,
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!descriptionResponse.ok) {
      const errorText = await descriptionResponse.text();
      console.error("Description generation error:", descriptionResponse.status, errorText);
      // Continue without the description if this fails
      profile.fullDescription = "";
    } else {
      const descriptionData = await descriptionResponse.json();
      let fullDescription = descriptionData.choices?.[0]?.message?.content || "";
      
      // Clean up quotes if present
      fullDescription = fullDescription.trim();
      if (fullDescription.startsWith('"') && fullDescription.endsWith('"')) {
        fullDescription = fullDescription.slice(1, -1);
      }
      
      profile.fullDescription = fullDescription;
    }

    console.log("Final character profile:", profile);

    return new Response(
      JSON.stringify({ profile }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-character-photo error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
