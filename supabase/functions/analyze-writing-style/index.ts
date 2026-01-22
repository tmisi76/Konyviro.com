import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE-STYLE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get user's writing samples
    const { data: samples, error: samplesError } = await supabaseClient
      .from("user_writing_samples")
      .select("content, word_count")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (samplesError) throw samplesError;
    if (!samples || samples.length === 0) {
      throw new Error("Nincs feltöltött szövegminta az elemzéshez");
    }

    logStep("Found samples", { count: samples.length, totalWords: samples.reduce((a, s) => a + s.word_count, 0) });

    // Combine samples for analysis (limit to ~10000 words)
    let combinedText = "";
    let totalWords = 0;
    for (const sample of samples) {
      if (totalWords + sample.word_count > 10000) break;
      combinedText += sample.content + "\n\n---\n\n";
      totalWords += sample.word_count;
    }

    logStep("Prepared text for analysis", { wordCount: totalWords });

    // Analyze with Anthropic
    const analysisPrompt = `Elemezd az alábbi magyar nyelvű szövegmintákat és készíts részletes stílusprofilt. A válaszodat JSON formátumban add meg.

Elemzendő szöveg:
${combinedText}

Válaszolj pontosan ebben a JSON formátumban:
{
  "avg_sentence_length": <szám: átlagos mondathossz szavakban>,
  "vocabulary_complexity": <szám 1-10 skálán: 1=egyszerű, 10=összetett/irodalmi>,
  "dialogue_ratio": <szám 0-1 között: párbeszéd aránya a szövegben>,
  "common_phrases": [<max 10 jellemző kifejezés vagy fordulat>],
  "tone_analysis": {
    "formality": <szám 1-10: 1=nagyon informális, 10=nagyon formális>,
    "emotionality": <szám 1-10: 1=tárgyilagos, 10=érzelmes>,
    "humor": <szám 1-10: 1=komoly, 10=humoros>,
    "descriptiveness": <szám 1-10: 1=tömör, 10=részletgazdag>
  },
  "style_summary": "<2-3 mondatos összefoglaló a szerző írói stílusáról magyarul>"
}

Csak a JSON-t add vissza, semmi mást!`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: analysisPrompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logStep("Anthropic API error", { status: response.status, error: errorData });
      throw new Error("AI elemzési hiba");
    }

    const aiResponse = await response.json();
    const content = aiResponse.content[0]?.text || "";
    logStep("AI response received", { length: content.length });

    // Parse the JSON response
    let analysis;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanJson = content.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.slice(7);
      } else if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.slice(3);
      }
      if (cleanJson.endsWith("```")) {
        cleanJson = cleanJson.slice(0, -3);
      }
      analysis = JSON.parse(cleanJson.trim());
    } catch (parseError) {
      logStep("JSON parse error", { error: String(parseError), content });
      throw new Error("Nem sikerült feldolgozni az elemzés eredményét");
    }

    // Upsert the style profile
    const { error: upsertError } = await supabaseClient
      .from("user_style_profiles")
      .upsert({
        user_id: user.id,
        avg_sentence_length: analysis.avg_sentence_length,
        vocabulary_complexity: analysis.vocabulary_complexity,
        dialogue_ratio: analysis.dialogue_ratio,
        common_phrases: analysis.common_phrases,
        tone_analysis: analysis.tone_analysis,
        style_summary: analysis.style_summary,
        samples_analyzed: samples.length,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      logStep("Upsert error", { error: upsertError });
      throw upsertError;
    }

    logStep("Style profile saved");

    return new Response(JSON.stringify({ 
      success: true,
      analysis,
      samplesAnalyzed: samples.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
