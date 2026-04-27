import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecapResult {
  summary: string;
  lastParagraph: string;
  nextSteps: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId } = await req.json();
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

    // Get user's most recent active chapter (the one they were last working on).
    const { data: project } = await supabase
      .from("projects")
      .select("id, title, genre, current_chapter_index")
      .eq("id", projectId)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: "Projekt nem található" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all chapters in order.
    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, title, content, sort_order, word_count, writing_status")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (!chapters || chapters.length === 0) {
      return new Response(
        JSON.stringify({
          summary: "Még nincs egyetlen fejezet sem. Kezdd el az első fejezet megírását!",
          lastParagraph: "",
          nextSteps: ["Hozz létre egy új fejezetet", "Indítsd el az AI vázlat generátort"],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find last chapter with content; previous chapter for context.
    const chaptersWithContent = chapters.filter(
      (c) => c.content && c.content.trim().length > 100
    );

    if (chaptersWithContent.length === 0) {
      return new Response(
        JSON.stringify({
          summary: "Még egyetlen fejezetben sincs jelentős tartalom. Most kezdődik a kalandod!",
          lastParagraph: "",
          nextSteps: [
            "Indítsd el az AI fejezet generátort az első fejezethez",
            "Vagy írd meg saját kezűleg a nyitójelenetet",
          ],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lastChapter = chaptersWithContent[chaptersWithContent.length - 1];
    const lastChapterContent = lastChapter.content || "";
    // Trim to last ~3000 chars for the recap context
    const truncated =
      lastChapterContent.length > 3000
        ? lastChapterContent.slice(-3000)
        : lastChapterContent;

    // Last paragraph: last non-empty line block.
    const paragraphs = lastChapterContent
      .split(/\n+/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 20);
    const lastParagraph = paragraphs[paragraphs.length - 1] || "";

    const systemPrompt = `Te egy tapasztalt szerkesztő vagy. Készíts egy rövid, lényegre törő emlékeztetőt a szerzőnek arról, hol tartott az utolsó fejezetben, és mi lehet a következő logikus lépés.

Válaszolj CSAK az alábbi JSON formában (NE használj markdown jelölést):
{
  "summary": "3-4 mondatos összefoglaló az utolsó fejezet eseményeiről, magyarul",
  "nextSteps": ["1. javaslat (1 mondat)", "2. javaslat (1 mondat)", "3. javaslat (1 mondat)"]
}`;

    const userPrompt = `Könyv címe: ${project.title}
Műfaj: ${project.genre}
Utolsó fejezet címe: ${lastChapter.title}

Az utolsó fejezet vége (folytatólagos szöveg):
"""
${truncated}
"""

Készíts emlékeztetőt és javasolj 3 logikus folytatási irányt.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      return new Response(JSON.stringify({ error: "AI hiba" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent: string = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON (strip code fences if present)
    let cleaned = rawContent.trim();
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    let parsed: { summary?: string; nextSteps?: string[] } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse hiba:", parseErr, "raw:", rawContent);
      // Fallback: use the raw content as summary.
      parsed = {
        summary: rawContent.slice(0, 500),
        nextSteps: [],
      };
    }

    const result: RecapResult = {
      summary: parsed.summary || "Nem sikerült összefoglalót készíteni.",
      lastParagraph,
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 3) : [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chapter-recap hiba:", e);
    const message = e instanceof Error ? e.message : "Ismeretlen hiba";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});