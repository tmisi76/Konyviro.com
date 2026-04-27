import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

/**
 * Build (or refresh) the canonical "series bible" — world rules, locations, themes, tone —
 * by analysing every existing volume in the series.
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
    const { data: userData, error: userErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Érvénytelen hitelesítés" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { seriesId } = await req.json();
    if (!seriesId) {
      return new Response(JSON.stringify({ error: "seriesId szükséges" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(supabaseUrl, serviceKey);

    // Verify ownership
    const { data: series } = await service
      .from("series")
      .select("id, user_id, title, description, bible")
      .eq("id", seriesId)
      .maybeSingle();
    if (!series || series.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Sorozat nem található" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect material from all volumes
    const { data: volumes } = await service
      .from("projects")
      .select("id, title, description, story_idea, generated_story, series_volume_number")
      .eq("series_id", seriesId)
      .order("series_volume_number", { ascending: true });

    let inputBlob = `SOROZAT: ${series.title}\n${series.description || ""}\n\n`;
    for (const v of volumes || []) {
      inputBlob += `\n--- ${v.series_volume_number || "?"}. KÖTET: ${v.title} ---\n`;
      if (v.description) inputBlob += `Leírás: ${v.description}\n`;
      if (v.story_idea) inputBlob += `Sztori-ötlet: ${v.story_idea}\n`;
      const gs = v.generated_story as Record<string, unknown> | null;
      if (gs?.synopsis) inputBlob += `Szinopszis: ${gs.synopsis}\n`;
      // Gather chapter summaries
      const { data: chapters } = await service
        .from("chapters")
        .select("title, summary")
        .eq("project_id", v.id)
        .order("sort_order");
      (chapters || []).forEach((c) => {
        if (c.summary) inputBlob += `• ${c.title}: ${c.summary}\n`;
      });
    }
    inputBlob = inputBlob.slice(0, 18000);

    const systemPrompt = `Te egy könyvsorozat-szerkesztő vagy. A felhasználó beküldi egy sorozat összes elérhető anyagát. A te feladatod, hogy ebből összeállíts egy strukturált "sorozat-bibliát" JSON-ban, ami a következő AI-generált fejezetek konzisztenciájának alapja lesz.

VÁLASZ FORMÁTUM (KÖTELEZŐ tiszta JSON, semmi más):
{
  "world": "1-2 bekezdéses leírás a világról, korszakról, alapszabályokról",
  "tone": "a sorozat összesített hangneme egy mondatban",
  "themes": ["kulcstéma 1", "kulcstéma 2", "..."],
  "locations": [{"name": "...", "description": "..."}],
  "rules": ["fontos világszabály 1", "..."]
}

Magyar nyelven írj. Ne találj ki nem létező részleteket — csak a kapott anyagból dolgozz.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2500,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: inputBlob || "Nincs még tartalom — generálj egy üres alap-bibliát a sorozat címe alapján." },
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
    let bible: Record<string, unknown> = {};
    try {
      bible = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse error", e, raw);
      bible = { world: cleaned.slice(0, 500), themes: [], locations: [], rules: [] };
    }

    await service.from("series").update({ bible, updated_at: new Date().toISOString() }).eq("id", seriesId);

    return new Response(JSON.stringify({ bible }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-series-bible error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
