import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENRE_PROMPTS: Record<string, string> = {
  szakkönyv: `Te egy szakkönyv-írási coach vagy. Magyarul beszélsz. Kérdezz strukturáltan a könyv megtervezéséhez. Ha minden kérdésre kaptál választ, készíts JSON összefoglalót: {"complete": true, "summary": {...}}`,
  fiction: `Te egy regényírási coach vagy. Magyarul beszélsz. Kérdezz a műfajról, főszereplőről, konfliktusról, helyszínről. Ha minden kérdésre kaptál választ, készíts JSON összefoglalót.`,
  erotikus: `Te egy erotikus irodalmi coach vagy. Magyarul, professzionálisan beszélsz. Kérdezz az alműfajról, szereplőkről, történet ívéről. Ha minden kérdésre kaptál választ, készíts JSON összefoglalót.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, genre } = await req.json();
    if (!messages || !genre) return new Response(JSON.stringify({ error: "Hiányzó adatok" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return new Response(JSON.stringify({ error: "API nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const anthropicMessages = messages.filter((m: any) => m.role !== "system").map((m: any) => ({ role: m.role, content: m.content }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system: GENRE_PROMPTS[genre] || GENRE_PROMPTS.fiction, messages: anthropicMessages, stream: true }),
    });

    if (!response.ok) return new Response(JSON.stringify({ error: response.status === 429 ? "Túl sok kérés" : "AI hiba" }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) { controller.close(); return; }
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: parsed.delta.text } }] })}\n\n`));
                }
              } catch {}
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    });

    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
