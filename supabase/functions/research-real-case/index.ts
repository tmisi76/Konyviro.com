import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  projectId?: string;
  caseReference: string;
  extraInstructions?: string;
  subcategory?: string;
  subject?: string;
  forceRefresh?: boolean;
}

const RESEARCH_SYSTEM_PROMPT = `Te egy oknyomozó kutató asszisztens vagy. A feladatod, hogy KIZÁRÓLAG dokumentált, ellenőrizhető, valóban megtörtént eseményekről gyűjts információt megbízható forrásokból (újságok, bírósági iratok, hivatalos jelentések, tudományos cikkek, enciklopédiák).

SZIGORÚ SZABÁLYOK:
- TILOS bármit kitalálni, sejtetni vagy spekulálni.
- Ha egy adat vitatott vagy bizonytalan, jelöld az "uncertainties" mezőben.
- Csak olyan idézetet adj vissza, amely dokumentáltan elhangzott vagy le van írva.
- Minden főbb állításhoz adj forrás-URL-t a sources tömbben.
- A válasz legyen magyar nyelvű, kivéve a tulajdonneveket és eredeti idézeteket.
- A timeline kronologikus legyen, dátumokkal (év vagy év-hónap-nap).`;

function buildResearchPrompt(caseRef: string, extra?: string, subcategory?: string, subject?: string): string {
  return `Készíts részletes, tényalapú kutatási dossier-t az alábbi valós ügyről egy oknyomozó könyv megírásához.

ÜGY / SZEMÉLY / ESEMÉNY: ${caseRef}
${subject ? `Vizsgálat tárgya (a szerző fókusza): ${subject}` : ""}
${subcategory ? `Téma: ${subcategory}` : ""}
${extra ? `Extra fókusz: ${extra}` : ""}

Adj vissza ÉRVÉNYES JSON-t ezzel a struktúrával:
{
  "caseTitle": "Az ügy hivatalos vagy közismert neve",
  "verifiedSummary": "5-8 mondatos tényszerű összefoglaló a teljes ügyről",
  "keyPlayers": [
    { "name": "Teljes név", "role": "Szerepe az ügyben", "verifiedFacts": "Dokumentált tények róla" }
  ],
  "timeline": [
    { "date": "ÉÉÉÉ vagy ÉÉÉÉ-HH-NN", "event": "Mi történt", "source": "honnan tudjuk" }
  ],
  "documentedQuotes": [
    { "quote": "szó szerinti idézet", "speaker": "ki mondta", "context": "mikor / hol", "source": "URL vagy hivatkozás" }
  ],
  "evidence": [
    { "type": "dokumentum/vallomás/pénzügyi adat/médiacikk/bírósági irat", "description": "mit tartalmaz", "source": "honnan származik" }
  ],
  "consequences": "Mi lett a végkimenetel: ítélet, lemondás, halál, börtön, társadalmi hatás stb.",
  "uncertainties": "Mi az, ami vitatott, nem bizonyított vagy ellentmondásos a források között",
  "majorSources": ["fő referenciák listája URL-ekkel"]
}

Legyél részletes, de minden adatnak ellenőrizhető forrásból kell származnia. Ha egy területről nincs megbízható infó, hagyd ki — ne találj ki adatot.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nincs jogosultság" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Érvénytelen token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as RequestBody;
    const { projectId, caseReference, extraInstructions, subcategory, subject, forceRefresh } = body;

    if (!caseReference || caseReference.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Hiányzik a valós ügy megnevezése" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: "A Perplexity kutatási szolgáltatás nincs konfigurálva" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client a cache-hez (RLS megkerülése csak a beolvasáskor — projektnél tulaj-ellenőrzés)
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Ha van projectId: tulaj-ellenőrzés és cache lookup
    if (projectId) {
      const { data: project } = await serviceClient
        .from("projects")
        .select("id, user_id")
        .eq("id", projectId)
        .maybeSingle();

      if (!project || project.user_id !== userData.user.id) {
        return new Response(JSON.stringify({ error: "Nincs jogosultság ehhez a projekthez" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!forceRefresh) {
        const { data: cached } = await serviceClient
          .from("project_research")
          .select("*")
          .eq("project_id", projectId)
          .eq("case_reference", caseReference)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cached) {
          console.log("Returning cached research for project", projectId);
          return new Response(JSON.stringify({
            cached: true,
            research: cached.research_data,
            sources: cached.sources,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // Perplexity hívás
    const userPrompt = buildResearchPrompt(caseReference, extraInstructions, subcategory, subject);

    console.log("Calling Perplexity sonar-reasoning for case:", caseReference);
    const pplxResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-reasoning",
        messages: [
          { role: "system", content: RESEARCH_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!pplxResponse.ok) {
      const errText = await pplxResponse.text();
      console.error("Perplexity error", pplxResponse.status, errText);
      return new Response(JSON.stringify({
        error: `Perplexity API hiba (${pplxResponse.status}): ${errText.slice(0, 300)}`,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pplxData = await pplxResponse.json();
    const rawContent = pplxData.choices?.[0]?.message?.content || "";
    const citations = pplxData.citations || [];

    // JSON kinyerés (sonar-reasoning gyakran <think> blokkot is ad)
    let researchJson: Record<string, unknown> = {};
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        researchJson = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("JSON parse error:", e);
        researchJson = { verifiedSummary: rawContent, _parseError: true };
      }
    } else {
      researchJson = { verifiedSummary: rawContent };
    }

    // Mentés
    if (projectId) {
      const { error: insertError } = await serviceClient
        .from("project_research")
        .insert({
          project_id: projectId,
          case_reference: caseReference,
          extra_instructions: extraInstructions || null,
          research_data: researchJson,
          sources: citations,
          model_used: "sonar-reasoning",
        });
      if (insertError) {
        console.error("Failed to cache research:", insertError);
      }
    }

    return new Response(JSON.stringify({
      cached: false,
      research: researchJson,
      sources: citations,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Ismeretlen hiba";
    console.error("research-real-case error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});