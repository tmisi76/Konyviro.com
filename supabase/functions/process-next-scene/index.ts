import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const PROMPTS: Record<string, string> = {
  fiction: "Te egy bestseller magyar író vagy. Írj gazdag leírásokkal és párbeszédekkel.",
  erotikus: "Te egy erotikus regényíró vagy. Írj érzéki magyar prózát.",
  szakkonyv: "Te egy szakkönyvíró vagy. Írj világos, informatív szöveget.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { projectId } = await req.json();
    if (!projectId) return new Response(JSON.stringify({ error: "projectId szükséges" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: project } = await supabase.from("projects").select("*, profiles!inner(user_id)").eq("id", projectId).single();
    if (!project) return new Response(JSON.stringify({ error: "Projekt nem található" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (project.writing_status !== "background_writing") return new Response(JSON.stringify({ status: "stopped" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: chapters } = await supabase.from("chapters").select("*").eq("project_id", projectId).order("sort_order");
    if (!chapters?.length) { await supabase.from("projects").update({ writing_status: "failed", background_error: "Nincsenek fejezetek" }).eq("id", projectId); return new Response(JSON.stringify({ error: "Nincsenek fejezetek" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    let targetChapter = null, targetSceneIndex = -1;
    for (const ch of chapters) { const scenes = (ch.scene_outline as any[]) || []; for (let i = 0; i < scenes.length; i++) { if (scenes[i].status === "pending" || scenes[i].status === "writing") { targetChapter = ch; targetSceneIndex = i; break; } } if (targetChapter) break; }

    if (!targetChapter) {
      await supabase.from("projects").update({ writing_status: "completed", background_error: null }).eq("id", projectId);
      const { data: userData } = await supabase.auth.admin.getUserById(project.user_id);
      if (userData?.user?.email) { try { await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-completion-email`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` }, body: JSON.stringify({ email: userData.user.email, projectTitle: project.title, projectId }) }); } catch {} }
      return new Response(JSON.stringify({ status: "completed" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const scenes = [...(targetChapter.scene_outline as any[])];
    scenes[targetSceneIndex].status = "writing";
    await supabase.from("chapters").update({ scene_outline: scenes, generation_status: "in_progress" }).eq("id", targetChapter.id);

    const { data: blocks } = await supabase.from("blocks").select("content").eq("chapter_id", targetChapter.id).order("sort_order");
    const prevContent = blocks?.map(b => b.content).join("\n\n") || "";
    const genre = project.genre === "szakkonyv" ? "szakkonyv" : project.subcategory === "erotikus" ? "erotikus" : "fiction";
    const scene = scenes[targetSceneIndex];
    const prompt = `Írj jelenetet:\nFejezet: ${targetChapter.title}\nJelenet ${targetSceneIndex + 1}/${scenes.length}\nPOV: ${scene.pov || "Harmadik személy"}\nHelyszín: ${scene.location}\nLeírás: ${scene.description}\nKulcsesemények: ${(scene.key_events || []).join(", ")}\nCél: ~${scene.target_words || 1000} szó${prevContent ? `\n\nFolytasd:\n${prevContent.slice(-2000)}` : ""}`;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    let sceneText = "";
    for (let i = 0; i < 5; i++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: Math.min((scene.target_words || 1000) * 2, 8000), system: PROMPTS[genre], messages: [{ role: "user", content: prompt }] }) });
      if (res.ok) { const d = await res.json(); sceneText = d.content?.[0]?.text || ""; break; }
      if (res.status === 429) { await sleep(30000 * (i + 1)); continue; }
      throw new Error(`API: ${res.status}`);
    }
    if (!sceneText) throw new Error("Generálás sikertelen");

    const { data: lastBlock } = await supabase.from("blocks").select("sort_order").eq("chapter_id", targetChapter.id).order("sort_order", { ascending: false }).limit(1).single();
    let sortOrder = (lastBlock?.sort_order || 0) + 1;
    const paragraphs = sceneText.split(/\n\n+/).filter(p => p.trim());
    if (paragraphs.length) await supabase.from("blocks").insert(paragraphs.map((c, i) => ({ chapter_id: targetChapter.id, type: "paragraph", content: c.trim(), sort_order: sortOrder + i })));

    scenes[targetSceneIndex].status = "completed";
    const wordCount = sceneText.split(/\s+/).length;
    const newWordCount = (targetChapter.word_count || 0) + wordCount;
    const allDone = scenes.every((s: any) => s.status === "completed");
    await supabase.from("chapters").update({ scene_outline: scenes, word_count: newWordCount, generation_status: allDone ? "completed" : "in_progress" }).eq("id", targetChapter.id);

    const totalWords = chapters.reduce((sum, ch) => sum + (ch.id === targetChapter.id ? newWordCount : (ch.word_count || 0)), 0);
    await supabase.from("projects").update({ word_count: totalWords }).eq("id", projectId);

    // Billing
    const month = new Date().toISOString().slice(0, 7);
    const { data: profile } = await supabase.from("profiles").select("monthly_word_limit, extra_words_balance").eq("user_id", project.user_id).single();
    const { data: usage } = await supabase.from("user_usage").select("words_generated").eq("user_id", project.user_id).eq("month", month).single();
    const limit = profile?.monthly_word_limit || 5000, used = usage?.words_generated || 0, extra = profile?.extra_words_balance || 0, remaining = Math.max(0, limit - used);
    if (limit === -1 || wordCount <= remaining) { await supabase.rpc("increment_words_generated", { p_user_id: project.user_id, p_word_count: wordCount }); }
    else { if (remaining > 0) await supabase.rpc("increment_words_generated", { p_user_id: project.user_id, p_word_count: remaining }); const fromExtra = Math.min(wordCount - remaining, extra); if (fromExtra > 0) await supabase.rpc("use_extra_credits", { p_user_id: project.user_id, p_word_count: fromExtra }); }

    return new Response(JSON.stringify({ status: "scene_completed", chapterId: targetChapter.id, sceneIndex: targetSceneIndex, wordsWritten: wordCount, totalWords }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
