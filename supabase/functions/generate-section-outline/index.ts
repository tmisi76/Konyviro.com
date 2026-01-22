import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const SYSTEM_PROMPT = `Te egy szakkönyv szerkesztő vagy. Készíts szekció-vázlatot.
Válaszolj CSAK JSON tömbként:
[{"section_number": 1, "title": "...", "type": "intro|concept|example|exercise|summary|case_study", "key_points": [...], "examples_needed": 1, "learning_objective": "...", "target_words": 800, "status": "pending"}]`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, chapterId, chapterTitle, chapterSummary, bookTopic, targetAudience } = await req.json();
    if (!projectId || !chapterId) return new Response(JSON.stringify({ error: "projectId és chapterId szükséges" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userPrompt = `Készíts 4-8 szekció-vázlatot:\n\nFEJEZET: ${chapterTitle}\n${chapterSummary ? `ÖSSZEFOGLALÓ: ${chapterSummary}` : ""}\nTÉMA: ${bookTopic || "Szakkönyv"}\nCÉLKÖZÖNSÉG: ${targetAudience || "Általános"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }], max_tokens: 4000 }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Túl sok kérés" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI hiba");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const sectionOutline = JSON.parse(content);

    if (!Array.isArray(sectionOutline)) throw new Error("Érvénytelen formátum");

    const sceneOutline = sectionOutline.map((s: any) => ({
      scene_number: s.section_number, title: s.title, pov: s.type, location: `Szekció: ${s.type}`, time: "", description: s.learning_objective || "", key_events: s.key_points || [], emotional_arc: `Példák: ${s.examples_needed || 0}`, target_words: s.target_words || 800, status: "pending",
    }));

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("chapters").update({ scene_outline: sceneOutline, generation_status: "pending" }).eq("id", chapterId);

    return new Response(JSON.stringify({ sceneOutline, sectionOutline }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
