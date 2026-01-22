import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const countWords = (t: string) => t.trim().split(/\s+/).filter(w => w.length > 0).length;

const PROMPTS: Record<string, string> = {
  fiction: "Te egy bestseller regényíró vagy. Írj élénk, képszerű magyar prózát.",
  erotikus: "Te egy erotikus regényíró vagy. Írj érzéki magyar prózát.",
  szakkonyv: "Te egy szakkönyv szerző vagy. Írj világos magyar szöveget.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, chapterId, sceneNumber, sceneOutline, previousContent, characters, storyStructure, genre, chapterTitle } = await req.json();
    if (!projectId || !chapterId || !sceneOutline) return new Response(JSON.stringify({ error: "Hiányzó mezők" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const prompt = `ÍRD MEG: ${chapterTitle} - Jelenet #${sceneNumber}: "${sceneOutline.title}"\nPOV: ${sceneOutline.pov}\nHelyszín: ${sceneOutline.location}\nMi történik: ${sceneOutline.description}\nKulcsesemények: ${sceneOutline.key_events?.join(", ")}\nCélhossz: ~${sceneOutline.target_words} szó${characters ? `\nKarakterek: ${characters}` : ""}${previousContent ? `\n\nFolytatás:\n${previousContent.slice(-1500)}` : ""}`;

    let content = "";
    for (let i = 0; i < 3; i++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-5-20250514", max_tokens: Math.min(sceneOutline.target_words * 2, 8000), system: PROMPTS[genre] || PROMPTS.fiction, messages: [{ role: "user", content: prompt }] }),
      });
      if (res.ok) { const d = await res.json(); content = d.content?.[0]?.text || ""; break; }
      if (res.status === 429) { await sleep(5000 * (i + 1)); continue; }
      throw new Error(`API error: ${res.status}`);
    }

    if (!content) throw new Error("Generálás sikertelen");
    const wordCount = countWords(content);

    // Update usage
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: project } = await supabase.from("projects").select("user_id").eq("id", projectId).single();
    if (project?.user_id && wordCount > 0) {
      const month = new Date().toISOString().slice(0, 7);
      const { data: profile } = await supabase.from("profiles").select("monthly_word_limit, extra_words_balance").eq("user_id", project.user_id).single();
      const { data: usage } = await supabase.from("user_usage").select("words_generated").eq("user_id", project.user_id).eq("month", month).single();
      const limit = profile?.monthly_word_limit || 5000;
      const used = usage?.words_generated || 0;
      const extra = profile?.extra_words_balance || 0;
      const remaining = Math.max(0, limit - used);
      
      if (limit === -1 || wordCount <= remaining) {
        await supabase.rpc("increment_words_generated", { p_user_id: project.user_id, p_word_count: wordCount });
      } else {
        if (remaining > 0) await supabase.rpc("increment_words_generated", { p_user_id: project.user_id, p_word_count: remaining });
        const fromExtra = Math.min(wordCount - remaining, extra);
        if (fromExtra > 0) await supabase.rpc("use_extra_credits", { p_user_id: project.user_id, p_word_count: fromExtra });
      }
    }

    return new Response(JSON.stringify({ content, wordCount }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
