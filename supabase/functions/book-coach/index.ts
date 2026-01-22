import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const GENRE_PROMPTS: Record<string, string> = {
  szakkönyv: "Te egy szakkönyv-írási coach vagy. Magyarul beszélsz. Kérdezz strukturáltan a könyv megtervezéséhez.",
  fiction: "Te egy regényírási coach vagy. Magyarul beszélsz. Kérdezz a műfajról, főszereplőről, konfliktusról.",
  erotikus: "Te egy erotikus irodalmi coach vagy. Magyarul, professzionálisan beszélsz.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, genre } = await req.json();
    if (!messages || !genre) return new Response(JSON.stringify({ error: "Hiányzó adatok" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const filteredMessages = messages.filter((m: any) => m.role !== "system").map((m: any) => ({ role: m.role, content: m.content }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: GENRE_PROMPTS[genre] || GENRE_PROMPTS.fiction }, ...filteredMessages], max_tokens: 2000, stream: true }),
    });

    if (!response.ok) return new Response(JSON.stringify({ error: response.status === 429 ? "Túl sok kérés" : "AI hiba" }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
