import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadSeriesContext, buildSeriesContextPrompt } from "../_shared/series-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

/**
 * Compare a chapter (or arbitrary text) against the series bible and return any
 * detected inconsistencies. Persists found warnings to series_consistency_warnings.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Hitelesítés szükséges" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Érvénytelen hitelesítés" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { projectId, chapterId, text } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId szükséges" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(supabaseUrl, serviceKey);

    // Verify project ownership
    const { data: project } = await service
      .from("projects")
      .select("id, user_id, series_id")
      .eq("id", projectId)
      .maybeSingle();
    if (!project || project.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Projekt nem található" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!project.series_id) {
      return new Response(JSON.stringify({ warnings: [], note: "A projekt nem része sorozatnak." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve text to check
    let textToCheck = text || "";
    if (!textToCheck && chapterId) {
      const { data: chapter } = await service
        .from("chapters")
        .select("content, title")
        .eq("id", chapterId)
        .maybeSingle();
      textToCheck = `${chapter?.title || ""}\n\n${chapter?.content || ""}`;
    }
    if (!textToCheck.trim()) {
      return new Response(JSON.stringify({ warnings: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = await loadSeriesContext(service, projectId);
    const seriesPrompt = buildSeriesContextPrompt(ctx);

    const systemPrompt = `Te egy könyvsorozat-szerkesztő (story editor) vagy. A te dolgod, hogy a megadott szöveget összeveted a sorozat bibliájával, és minden olyan ellentmondást jelölj, ami megtöri a kontinuitást.
${seriesPrompt}

VÁLASZ FORMÁTUM (KÖTELEZŐ tiszta JSON, semmi más):
{
  "warnings": [
    {
      "warning_type": "character" | "plot" | "location" | "timeline" | "world_rule",
      "severity": "low" | "medium" | "high",
      "description": "1-2 mondatos leírás az ellentmondásról",
      "suggestion": "konkrét javaslat a javításra",
      "excerpt": "az érintett szövegrészlet, max 200 karakter"
    }
  ]
}

Ha nincs ellentmondás, üres warnings tömböt adj vissza. Ne találj ki ellentmondást — csak valódi, igazolható eltéréseket jelölj.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `ELEMZENDŐ SZÖVEG:\n${textToCheck.slice(0, 14000)}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI hiba" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = await aiRes.json();
    const raw = ai.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    let parsed: { warnings?: Array<Record<string, string>> } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse error", e, raw);
      parsed = { warnings: [] };
    }

    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];

    // Persist warnings (status="new")
    if (warnings.length > 0) {
      const rows = warnings.map((w) => ({
        series_id: project.series_id as string,
        project_id: projectId,
        chapter_id: chapterId || null,
        warning_type: ["character", "plot", "location", "timeline", "world_rule"].includes(w.warning_type)
          ? w.warning_type
          : "plot",
        severity: ["low", "medium", "high"].includes(w.severity) ? w.severity : "medium",
        description: String(w.description || "").slice(0, 1000),
        suggestion: w.suggestion ? String(w.suggestion).slice(0, 1000) : null,
        excerpt: w.excerpt ? String(w.excerpt).slice(0, 500) : null,
        status: "new",
      }));
      await service.from("series_consistency_warnings").insert(rows);
    }

    return new Response(JSON.stringify({ warnings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-series-consistency error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
