import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Te egy mester szerkesztő és stiliszta vagy. A feladatod, hogy egy meglévő szöveget javíts ki egy hibalista alapján. A cél nem az újraírás, hanem a célzott javítás.

JAVÍTÁSI SZABÁLYOK:
1.  **Csak a hibákat javítsd:** Ne írd át a szöveget teljesen, csak azokat a részeket, amelyek a hibalistában szerepelnek.
2.  **Őrizd meg a stílust:** Tartsd meg az eredeti szöveg hangulatát és a szerző stílusát.
3.  **Légy precíz:** Ha egy szóismétlést kell javítanod, csak azt a szót cseréld le egy szinonimára.
4.  **A válaszod CSAK a teljes, javított szöveg legyen.** Ne írj magyarázatot vagy kommentárt.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { chapter_id } = await req.json();
    if (!chapter_id) {
      return new Response(JSON.stringify({ error: "chapter_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify chapter ownership
    const { data: chapter, error: chapterError } = await supabaseClient
      .from("chapters")
      .select("id, project_id, content, projects!inner(user_id)")
      .eq("id", chapter_id)
      .single();

    if (chapterError || !chapter) {
      return new Response(JSON.stringify({ error: "Chapter not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((chapter.projects as any).user_id !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch blocks for this chapter
    const { data: blocks, error: blocksError } = await supabaseClient
      .from("blocks")
      .select("id, content, sort_order")
      .eq("chapter_id", chapter_id)
      .order("sort_order");

    if (blocksError) throw blocksError;

    // Get content - either from blocks or chapter content field
    let originalContent = "";
    if (blocks && blocks.length > 0) {
      originalContent = blocks.map((b) => b.content).join("\n\n");
    } else if (chapter.content) {
      originalContent = chapter.content;
    }

    if (!originalContent.trim()) {
      return new Response(JSON.stringify({ message: "No content to refine." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quality issues
    const { data: issues, error: issuesError } = await supabaseClient
      .from("quality_issues")
      .select("*")
      .eq("chapter_id", chapter_id);

    if (issuesError) throw issuesError;

    if (!issues || issues.length === 0) {
      return new Response(JSON.stringify({ message: "No issues to refine." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construct prompt
    const userPrompt = `JAVÍTÁSI FELADAT:

Eredeti Szöveg:
---
${originalContent}
---

Hibalista:
${issues
  .map(
    (i) =>
      `- HIBA TÍPUSA: ${i.issue_type}\n  - HELY: "${i.location_text || "N/A"}"\n  - LEÍRÁS: ${i.description}\n  - JAVASLAT: ${i.suggestion || "Nincs konkrét javaslat"}`
  )
  .join("\n")}

Feladat: Javítsd ki a fenti szöveget a hibalista alapján. A válaszod csak a teljes, javított szöveg legyen.
`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI API error");
    }

    const data = await response.json();
    const refinedContent = data.choices?.[0]?.message?.content || "";

    if (!refinedContent.trim()) {
      throw new Error("AI returned empty response");
    }

    // Update content - if blocks exist, update chapter content field
    // For simplicity, we store the refined version in chapter.content
    const { error: updateError } = await supabaseClient
      .from("chapters")
      .update({ content: refinedContent, updated_at: new Date().toISOString() })
      .eq("id", chapter_id);

    if (updateError) throw updateError;

    // Delete the issues that have been addressed
    const issueIds = issues.map((i) => i.id);
    await supabaseClient.from("quality_issues").delete().in("id", issueIds);

    return new Response(
      JSON.stringify({
        message: "Chapter refined successfully.",
        issues_fixed: issues.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("refine-chapter error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
