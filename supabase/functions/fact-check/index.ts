import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, context } = await req.json();
    if (!text) return new Response(JSON.stringify({ error: "Szöveg szükséges" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const systemPrompt = "Te egy tényellenőr asszisztens vagy. Ellenőrizd az állítás hitelességét. Válaszolj magyar nyelven.";
    const userPrompt = context ? `Ellenőrizd: "${text}"\nKontextus: ${context}` : `Ellenőrizd: "${text}"`;

    // Retry logic exponenciális backoff-al (429/502/503 kezelés)
    const maxRetries = 7;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { 
            "x-api-key": ANTHROPIC_API_KEY, 
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ 
            model: "claude-sonnet-4-20250514", 
            max_tokens: 1000,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429 || response.status === 502 || response.status === 503 || response.status === 529) {
          console.error(`Status ${response.status} (attempt ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
        break;
      } catch (fetchError) {
        console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          if (attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return new Response(JSON.stringify({ error: "Időtúllépés" }), { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw fetchError;
      }
    }

    if (!response || !response.ok) {
      throw new Error("AI hiba");
    }

    const data = await response.json();
    const result = data.content?.[0]?.text || "Nem sikerült.";

    return new Response(JSON.stringify({ success: true, result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
