import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OUTLINE_COST = 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { projectId } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId kötelező" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: project } = await supabaseUser
      .from("projects")
      .select("id, user_id, title, genre, subcategory")
      .eq("id", projectId)
      .single();
    if (!project || project.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Credit check
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("monthly_word_limit, extra_words_balance")
      .eq("user_id", userId)
      .single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const monthlyLimit = profile.monthly_word_limit ?? 5000;
    const month = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabaseAdmin
      .from("user_usage")
      .select("words_generated")
      .eq("user_id", userId)
      .eq("month", month)
      .maybeSingle();
    const used = usage?.words_generated || 0;
    const extra = profile.extra_words_balance || 0;
    if (monthlyLimit !== -1) {
      const total = Math.max(0, monthlyLimit - used) + extra;
      if (total < OUTLINE_COST) {
        return new Response(
          JSON.stringify({
            error: `Nincs elég kredit. A vázlat generálás ${OUTLINE_COST} szót igényel.`,
            code: "INSUFFICIENT_CREDITS",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch extracted raw sources
    const { data: sources } = await supabaseAdmin
      .from("raw_sources")
      .select("id, title, extracted_text, word_count")
      .eq("project_id", projectId)
      .eq("status", "extracted")
      .order("created_at", { ascending: true });

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nincs feldolgozott forrásanyag a projektben." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt – keep size reasonable (truncate each source)
    const MAX_PER_SOURCE = 6000;
    const corpus = sources
      .map((s, i) => {
        const text = (s.extracted_text || "").slice(0, MAX_PER_SOURCE);
        return `### FORRÁSANYAG ${i + 1}: ${s.title}\n${text}`;
      })
      .join("\n\n");

    const systemPrompt = `Tapasztalt szakkönyv-szerkesztő vagy. A felhasználó saját blogposztjait, jegyzeteit és cikkeit kapod.
Feladatod: ezekből a szétszórt anyagokból szerkessz egy összefüggő, professzionális szakkönyv-vázlatot magyar nyelven.

ELVÁRÁSOK:
- 6-12 fejezet, logikus sorrendben (alapok → mély → összefoglalás).
- Minden fejezethez: rövid leírás (2-3 mondat), 3-6 alfejezet/kulcspont.
- Jelöld meg azokat a fejezeteket, amelyekhez a forrásanyag már sok tartalmat ad ('source_coverage': 'high'/'medium'/'low').
- Ha hiányt látsz (olyan téma, amit a könyvhöz hozzá kellene tenni, de a forrásanyagból nincs benne), tedd a 'gaps' tömbbe.
- A 'topic_clusters' adja vissza, mely forrásanyagok mely témákhoz kapcsolódnak.

CSAK érvényes JSON-t adj vissza, semmi mást, ezzel a struktúrával:
{
  "title_suggestion": "string",
  "subtitle_suggestion": "string",
  "chapters": [
    {
      "title": "string",
      "description": "string",
      "key_points": ["string"],
      "source_coverage": "high|medium|low",
      "related_source_ids": ["uuid"]
    }
  ],
  "gaps": ["string"],
  "topic_clusters": [
    { "topic": "string", "source_ids": ["uuid"] }
  ]
}`;

    const sourceIdMap = sources.map((s) => `- ${s.id}: ${s.title}`).join("\n");
    const userPrompt = `PROJEKT CÍME: ${project.title}
TÉMA / ALKATEGÓRIA: ${project.subcategory || project.genre || "szakkönyv"}

FORRÁSANYAG-AZONOSÍTÓK:
${sourceIdMap}

--- TARTALOM ---
${corpus}`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY hiányzik");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Próbáld újra később." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI Gateway: nincs elég kredit a fiókodon." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI hívás sikertelen: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Üres AI válasz");

    let outline: any;
    try {
      outline = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      throw new Error("Az AI nem érvényes JSON-t adott vissza");
    }

    // Mark sources as analyzed + assign topic_cluster
    const clusters: { topic: string; source_ids: string[] }[] = outline.topic_clusters || [];
    for (const cluster of clusters) {
      if (!cluster.source_ids?.length) continue;
      await supabaseAdmin
        .from("raw_sources")
        .update({ topic_cluster: cluster.topic, status: "analyzed" })
        .in("id", cluster.source_ids);
    }
    // Mark any leftover as analyzed too
    await supabaseAdmin
      .from("raw_sources")
      .update({ status: "analyzed" })
      .eq("project_id", projectId)
      .eq("status", "extracted");

    // Deduct credits
    if (monthlyLimit !== -1) {
      const remainingMonthly = Math.max(0, monthlyLimit - used);
      if (OUTLINE_COST <= remainingMonthly) {
        await supabaseAdmin.rpc("increment_words_generated", {
          p_user_id: userId,
          p_word_count: OUTLINE_COST,
        });
      } else {
        if (remainingMonthly > 0) {
          await supabaseAdmin.rpc("increment_words_generated", {
            p_user_id: userId,
            p_word_count: remainingMonthly,
          });
        }
        const fromExtra = OUTLINE_COST - remainingMonthly;
        if (fromExtra > 0) {
          await supabaseAdmin.rpc("use_extra_credits", {
            p_user_id: userId,
            p_word_count: fromExtra,
          });
        }
      }
    } else {
      await supabaseAdmin.rpc("increment_words_generated", {
        p_user_id: userId,
        p_word_count: OUTLINE_COST,
      });
    }

    return new Response(
      JSON.stringify({ outline, credits_used: OUTLINE_COST }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("analyze-raw-sources error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});