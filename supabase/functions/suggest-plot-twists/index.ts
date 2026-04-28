import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getModelForTask } from "../_shared/ai-settings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Suggests 3 plot twists logically consistent with the existing story so far.
 * Uses tool calling for guaranteed structured output.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const AI_MODEL = await getModelForTask("structural");
    const { projectId, currentChapterId } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId szükséges" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Hitelesítés szükséges" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const [projectRes, chaptersRes, charactersRes] = await Promise.all([
      supabase
        .from("projects")
        .select("title, genre, tone, story_idea, target_audience")
        .eq("id", projectId)
        .single(),
      supabase
        .from("chapters")
        .select("title, summary, content, sort_order")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("characters")
        .select("name, role, motivations, fears, positive_traits, negative_traits")
        .eq("project_id", projectId)
        .limit(10),
    ]);

    const project = projectRes.data;
    const chapters = chaptersRes.data || [];
    const characters = charactersRes.data || [];

    if (!project) {
      return new Response(JSON.stringify({ error: "Projekt nem található" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a compact story summary
    const storySummary = chapters
      .filter((c) => (c.summary && c.summary.length > 10) || (c.content && c.content.length > 100))
      .slice(0, 20)
      .map((c, idx) => {
        const synopsis =
          c.summary && c.summary.length > 10
            ? c.summary
            : (c.content || "").slice(0, 250) + "...";
        return `${idx + 1}. ${c.title}: ${synopsis}`;
      })
      .join("\n");

    const charactersBlock =
      characters.length > 0
        ? characters
            .map(
              (c: any) =>
                `- ${c.name} (${c.role || "szereplő"}): motivációk=${(c.motivations || []).slice(0, 2).join(", ") || "—"}, félelmek=${(c.fears || []).slice(0, 2).join(", ") || "—"}`
            )
            .join("\n")
        : "(nincs karakter megadva)";

    // Find current chapter context if provided
    let currentChapterText = "";
    if (currentChapterId) {
      const { data: cur } = await supabase
        .from("chapters")
        .select("title, content")
        .eq("id", currentChapterId)
        .maybeSingle();
      if (cur?.content) {
        currentChapterText = `\n\nAktuális fejezet (${cur.title}) utolsó része:\n"""${(cur.content || "").slice(-1500)}"""`;
      }
    }

    const systemPrompt = `Te egy díjnyertes regényszerkesztő vagy. Adj 3 különböző, MEGLEPŐ DE LOGIKUS plot twist javaslatot, amelyek szervesen következnek az eddig leírt cselekményből.

SZABÁLYOK:
- Mindhárom javaslat KÜLÖNBÖZŐ típusú legyen (pl. karakter-leleplezés, váratlan szövetség, identity reveal, halálos áldozat, morális dilemma, időbeli ugrás stb.)
- Mindegyiknek illeszkednie kell a műfajhoz és a karakterek motivációihoz
- 1-2 mondatos magyarázat: miért logikus, milyen előzmények támasztják alá
- Magyar nyelven, természetes stílusban`;

    const userPrompt = `Könyv: ${project.title} (${project.genre})
Tónus: ${project.tone || "semleges"}
Eredeti történet ötlet: ${project.story_idea || "—"}

Szereplők:
${charactersBlock}

Eddigi cselekmény:
${storySummary || "(még üres)"}${currentChapterText}

Adj 3 plot twist javaslatot a hívás eszközzel.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_plot_twists",
              description: "Visszaad 3 plot twist javaslatot a regényhez.",
              parameters: {
                type: "object",
                properties: {
                  twists: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: {
                          type: "string",
                          description: "Rövid cím (max 6 szó)",
                        },
                        type: {
                          type: "string",
                          description:
                            "Csavar típusa (pl. 'Identity Reveal', 'Árulás', 'Váratlan Szövetség')",
                        },
                        description: {
                          type: "string",
                          description: "2-3 mondatos részletes leírás",
                        },
                        reasoning: {
                          type: "string",
                          description:
                            "1-2 mondat: miért logikus, milyen előzmények támogatják",
                        },
                      },
                      required: ["title", "type", "description", "reasoning"],
                      additionalProperties: false,
                    },
                    minItems: 3,
                    maxItems: 3,
                  },
                },
                required: ["twists"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_plot_twists" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Túl sok kérés, próbáld újra később." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kreditek elfogytak, töltsd fel az egyenleged." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway hiba:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI hiba" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const argsText: string = toolCall?.function?.arguments || "{}";

    let parsed: { twists?: unknown[] } = {};
    try {
      parsed = JSON.parse(argsText);
    } catch (parseErr) {
      console.error("Tool call parse hiba:", parseErr, argsText);
      return new Response(
        JSON.stringify({ error: "Az AI válasza nem volt értelmezhető. Próbáld újra." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twists = Array.isArray(parsed.twists) ? parsed.twists.slice(0, 3) : [];

    return new Response(JSON.stringify({ twists }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-plot-twists hiba:", e);
    const message = e instanceof Error ? e.message : "Ismeretlen hiba";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});