import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const SYSTEM_PROMPTS: Record<string, string> = {
  szakkonyv: "Te egy szakkönyv író asszisztens vagy. Strukturált, didaktikus stílusban írj. Magyar nyelven válaszolj.",
  fiction: "Te egy kreatív író asszisztens vagy. Narratív, leíró stílusban írj. Magyar nyelven válaszolj.",
  erotikus: "Te egy felnőtt tartalom író asszisztens vagy. Érzéki, intim stílusban írj. Magyar nyelven válaszolj.",
};

const ACTION_PROMPTS: Record<string, string> = {
  continue: "Folytasd a szöveget természetesen.", rewrite: "Írd át a szöveget.", shorten: "Tömörítsd.", expand: "Bővítsd ki.", dialogue: "Írj párbeszédet.", description: "Írj leírást.", chat: "Válaszolj a kérdésre.",
};

const buildStylePrompt = (styleProfile: Record<string, unknown> | null): string => {
  if (!styleProfile?.style_summary) return "";
  const parts = ["\n--- STÍLUS ---", `Összefoglaló: ${styleProfile.style_summary}`];
  if (styleProfile.avg_sentence_length) parts.push(`Mondathossz: ${styleProfile.avg_sentence_length} szó`);
  if (styleProfile.dialogue_ratio) parts.push(`Párbeszéd: ${Math.round(Number(styleProfile.dialogue_ratio) * 100)}%`);
  parts.push("Utánozd ezt a stílust!");
  return parts.join("\n");
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, prompt, context, genre, settings, projectId, chapterId } = await req.json();
    if (!prompt) return new Response(JSON.stringify({ error: "Prompt szükséges" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let stylePrompt = "";
    const authHeader = req.headers.get("Authorization");
    if (settings?.useProjectStyle && authHeader) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) {
        const { data: styleProfile } = await supabase.from("user_style_profiles").select("*").eq("user_id", user.id).single();
        if (styleProfile) stylePrompt = buildStylePrompt(styleProfile);
      }
    }

    const systemPrompt = `${SYSTEM_PROMPTS[genre] || SYSTEM_PROMPTS.fiction}\n\n${ACTION_PROMPTS[action] || ACTION_PROMPTS.chat}${context?.bookDescription ? `\n\nKönyv: ${context.bookDescription}` : ""}${stylePrompt}`;
    const maxTokens = settings?.length === "long" ? 6000 : settings?.length === "medium" ? 2000 : 500;

    const messages = [];
    if (context?.chapterContent) { messages.push({ role: "user", content: `Kontextus:\n${context.chapterContent}` }); messages.push({ role: "assistant", content: "Megértettem." }); }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, ...messages], max_tokens: maxTokens, stream: true }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Túl sok kérés" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
