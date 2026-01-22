import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const countWords = (text: string): number => text.trim().split(/\s+/).filter(w => w.length > 0).length;

const SECTION_PROMPTS: Record<string, string> = {
  intro: "Írj bevezető szekciót.", concept: "Magyarázd el a fogalmat.", example: "Adj példákat.", exercise: "Készíts gyakorlatot.", summary: "Foglald össze.", case_study: "Írj esettanulmányt.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, chapterId, sectionNumber, sectionOutline, previousContent, bookTopic, targetAudience, chapterTitle } = await req.json();
    if (!projectId || !chapterId || !sectionOutline) return new Response(JSON.stringify({ error: "Hiányzó mezők" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sectionType = sectionOutline.pov || sectionOutline.type || "concept";
    const userPrompt = `ÍRD MEG: ${chapterTitle} - Szekció #${sectionNumber}: "${sectionOutline.title}"\nTípus: ${sectionType}\n${SECTION_PROMPTS[sectionType] || ""}\nKulcspontok: ${(sectionOutline.key_events || []).join(", ")}\nCélhossz: ~${sectionOutline.target_words} szó${previousContent ? `\n\nFolytatás:\n${previousContent.slice(-1500)}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: "Te egy szakkönyv szerző vagy. Írj világos magyar szöveget." }, { role: "user", content: userPrompt }], max_tokens: Math.min(sectionOutline.target_words * 2, 6000) }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Túl sok kérés" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI hiba");
    }

    const data = await response.json();
    const sectionContent = data.choices?.[0]?.message?.content || "";
    const wordCount = countWords(sectionContent);

    if (wordCount > 0) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: project } = await supabase.from("projects").select("user_id").eq("id", projectId).single();
      if (project?.user_id) {
        const month = new Date().toISOString().slice(0, 7);
        const { data: profile } = await supabase.from("profiles").select("monthly_word_limit, extra_words_balance").eq("user_id", project.user_id).single();
        const { data: usage } = await supabase.from("user_usage").select("words_generated").eq("user_id", project.user_id).eq("month", month).single();
        const limit = profile?.monthly_word_limit || 5000, used = usage?.words_generated || 0, extra = profile?.extra_words_balance || 0, remaining = Math.max(0, limit - used);
        if (limit === -1 || wordCount <= remaining) await supabase.rpc("increment_words_generated", { p_user_id: project.user_id, p_word_count: wordCount });
        else { if (remaining > 0) await supabase.rpc("increment_words_generated", { p_user_id: project.user_id, p_word_count: remaining }); const fromExtra = Math.min(wordCount - remaining, extra); if (fromExtra > 0) await supabase.rpc("use_extra_credits", { p_user_id: project.user_id, p_word_count: fromExtra }); }
      }
    }

    return new Response(JSON.stringify({ content: sectionContent, wordCount }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
