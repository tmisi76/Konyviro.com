import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackUsage } from "../_shared/usage-tracker.ts";
import { getModelForTask } from "../_shared/ai-settings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * AI Continue Text — generates 1-3 paragraphs continuing the user's text in their style.
 * Pulls in: previous ~800 words, characters context, story arc, project tone.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const AI_MODEL = await getModelForTask("scene");
    const { projectId, chapterId, contextText, paragraphCount = 1 } = await req.json();

    if (!projectId || !chapterId) {
      return new Response(
        JSON.stringify({ error: "projectId és chapterId szükséges" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Hitelesítés sikertelen" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project, chapter, characters in parallel
    const [projectRes, chapterRes, charactersRes] = await Promise.all([
      supabase
        .from("projects")
        .select("title, genre, tone, target_audience, fiction_style, audience_level")
        .eq("id", projectId)
        .single(),
      supabase.from("chapters").select("title, content").eq("id", chapterId).single(),
      supabase
        .from("characters")
        .select("name, role, positive_traits, negative_traits, motivations, speech_style")
        .eq("project_id", projectId)
        .limit(8),
    ]);

    const project = projectRes.data;
    const chapter = chapterRes.data;
    const characters = charactersRes.data || [];

    if (!project || !chapter) {
      return new Response(JSON.stringify({ error: "Projekt vagy fejezet nem található" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context: prefer explicit contextText (e.g. text up to cursor); fallback to chapter content tail.
    const sourceText: string =
      typeof contextText === "string" && contextText.trim().length > 0
        ? contextText
        : chapter.content || "";
    const truncated =
      sourceText.length > 4000 ? sourceText.slice(-4000) : sourceText;

    const characterBlock =
      characters.length > 0
        ? characters
            .map(
              (c: any) =>
                `- ${c.name} (${c.role || "szereplő"}): ${(c.positive_traits || []).slice(0, 3).join(", ")}${
                  c.speech_style ? ` | beszédstílus: ${c.speech_style}` : ""
                }`
            )
            .join("\n")
        : "(nincs karakter megadva)";

    const targetCount = Math.min(Math.max(Number(paragraphCount) || 1, 1), 3);

    const systemPrompt = `Te egy professzionális magyar író vagy. A szerző stílusában folytatsz egy szöveget pontosan ${targetCount} bekezdésnyi terjedelemben.

SZIGORÚ SZABÁLYOK:
- A folytatás SIMÁN illeszkedjen az utolsó mondathoz (folyamatos próza, NE új szakasz).
- Tartsd be a műfaji konvenciókat (${project.genre || "fikció"}).
- Tartsd a tónust: ${project.tone || "semleges"}.
- Karakter-konzisztencia kötelező (ne találj ki új szereplőket, használd a megadottakat).
- Magyar nyelvtan kifogástalan, természetes párbeszédek, szavak változatossága.
- NE adj hozzá fejezetcímet, csillagokat, magyarázatot, csak a folytatás szövegét.
- Kerüld a kliséket, a túlmagyarázást és az ismétléseket.
- Pontosan ${targetCount} bekezdés, bekezdések közt egy üres sor.`;

    const userPrompt = `Könyv: ${project.title} (${project.genre})
Fejezet: ${chapter.title}

Szereplők:
${characterBlock}

Eddigi szöveg (folytasd a TELJESEN UTOLSÓ mondat után, ne ismételd meg):
"""
${truncated}
"""

Most folytasd ${targetCount} bekezdéssel a szerző stílusában. CSAK a folytatás szövegét add vissza, semmi mást.`;

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
      return new Response(JSON.stringify({ error: "AI hiba a folytatás közben" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const generatedText: string = (aiData.choices?.[0]?.message?.content || "").trim();

    if (!generatedText) {
      return new Response(
        JSON.stringify({ error: "Az AI nem adott vissza szöveget. Próbáld újra." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Track word usage (count only words with letters, like the rest of the system)
    const wordCount = (generatedText.match(/[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű][A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű'\-]*/g) || [])
      .length;
    try {
      await trackUsage(supabase, user.id, wordCount);
    } catch (trackErr) {
      console.error("Usage tracking hiba (nem blokkoló):", trackErr);
    }

    return new Response(
      JSON.stringify({ text: generatedText, wordCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-continue-text hiba:", e);
    const message = e instanceof Error ? e.message : "Ismeretlen hiba";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});