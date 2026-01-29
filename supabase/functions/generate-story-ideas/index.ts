import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Nincs jogosultság" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen vagy lejárt token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${userData.user.id}`);
    // ========== END AUTHENTICATION CHECK ==========

    const { genre, subcategory, tone, length, targetAudience, additionalInstructions, storyDescription, authorProfile, previousIdeas } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFiction = genre === "fiction";
    
    // Előző ötletek kizárása az újragenerálásnál
    const previousIdeasClause = previousIdeas?.length > 0 
      ? `\n\nKRITIKUS SZABÁLY - KERÜLD AZ ALÁBBI ÖTLETEKET:\n${previousIdeas.map((t: string, i: number) => `${i+1}. "${t}"`).join('\n')}\n\nGenerálj TELJESEN MÁS témákat, megközelítéseket, címeket és koncepciókat! Az új ötletek NE hasonlítsanak az előzőekre semmilyen módon.`
      : "";

    // Szerző által megadott történet leírás (80% súly)
    const storyDescriptionClause = storyDescription?.trim() 
      ? `\n\n🎯 A SZERZŐ SAJÁT TÖRTÉNETE/ÖTLETE (KIEMELT FONTOSSÁGÚ - 80% SÚLY):\n"${storyDescription}"\n\nAz ötleteknek KÖTELEZŐEN ezen a történeten/ötleten kell alapulniuk! Ne generálj teljesen eltérő témákat - a fenti leírás a legfontosabb input!`
      : "";

    const systemPrompt = isFiction 
      ? "Te egy kreatív könyvíró asszisztens vagy. Mindig érvényes JSON-t adj vissza."
      : `Te egy bestseller szakértői könyveket író ghostwriter vagy${authorProfile?.authorName ? ` ${authorProfile.authorName} nevében` : ""}. 

SZAKKÖNYV ÍRÁS SZABÁLYOK:
- NE használj kitalált szereplőket vagy fiktív karaktereket
- A szerző első személyben beszél ("Én", "Mi")
- Közvetlen megszólítás ("Te" vagy "Ön" a formalitástól függően)
- Zero fluff - tömör, lényegre törő szöveg
- Minden ígéret mögött konkrét szám vagy példa
- Személyes történetek a hitelesség érdekében
- Gyakorlatias, azonnal alkalmazható tanácsok

Mindig érvényes JSON-t adj vissza.`;
    
    const prompt = isFiction 
      ? `Generálj 3 egyedi sztori ötletet a következő paraméterek alapján:
${storyDescriptionClause}

Műfaj: Fiction
Alkategória: ${subcategory}
Hangnem: ${tone}
Hossz: ${length === "short" ? "rövid (~30k szó)" : length === "medium" ? "közepes (~60k szó)" : "hosszú (~100k szó)"}
${targetAudience ? `Célközönség: ${targetAudience}` : ""}
${additionalInstructions ? `Extra instrukciók: ${additionalInstructions}` : ""}
${previousIdeasClause}

VÁLASZOLJ ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "ideas": [
    {
      "id": "idea-1",
      "title": "Könyv címe",
      "synopsis": "3-4 mondatos szinopszis ami felkelti az érdeklődést",
      "mainElements": ["Elem 1", "Elem 2", "Elem 3"],
      "uniqueSellingPoint": "Mi teszi ezt az ötletet egyedivé és izgalmassá",
      "mood": "A könyv hangulata 2-3 szóban"
    }
  ]
}`
      : `Generálj 3 egyedi SZAKKÖNYV ötletet a következő paraméterek alapján:
${storyDescriptionClause}

Téma: ${subcategory}
Hangnem: ${tone}
Hossz: ${length === "short" ? "rövid (~30k szó, 10 fejezet)" : length === "medium" ? "közepes (~60k szó, 18 fejezet)" : "hosszú (~100k szó, 28 fejezet)"}
${targetAudience ? `Célközönség: ${targetAudience}` : ""}
${authorProfile?.authorBackground ? `Szerző háttere: ${authorProfile.authorBackground}` : ""}
${authorProfile?.mainPromise ? `Fő ígéret: ${authorProfile.mainPromise}` : ""}
${additionalInstructions ? `Extra instrukciók: ${additionalInstructions}` : ""}
${previousIdeasClause}

KÖTELEZŐ KÖNYV ELEMEK (minden ötlethez):
1. NAGY, SPECIFIKUS ÍGÉRET - Konkrét, mérhető eredmény (pl. "7 számjegyű bevétel 12 hónap alatt", "100 új ügyfél 90 nap alatt")
2. EGYEDI MÓDSZERTAN NEVE - Brandelhető keretrendszer (pl. "A Million-Dollar Book Method", "A 4 Lépéses Áttörés Rendszer")
3. 3-5 FŐ FEJEZET TÉMA - A könyv gerincét adó kulcstémák
4. KONKRÉT EREDMÉNY - Mit ér el az olvasó a könyv végére

KÖTELEZŐ STRUKTÚRA MINDEN KÖNYVHÖZ:
- Bevezetés (Miért olvasd el? Mi a probléma?)
- A módszertan bemutatása (Hogyan jött létre? Mi a lényege?)
- Tematikus fejezetek (Lépésről-lépésre útmutató)
- Implementáció (Hogyan kezdj hozzá?)
- Zárás (Következő lépések, CTA)

STÍLUS KÖVETELMÉNYEK:
- Első személy narratíva
- Közvetlen megszólítás
- Rövid bekezdések (max 3-4 mondat)
- Minden fejezethez összefoglaló
- Személyes történetek és esettanulmányok
- Konkrét számok és statisztikák

NE HASZNÁLJ:
- Fiktív karaktereket vagy szereplőket
- Általános, üres ígéreteket ("sikeres leszel", "jobb életed lesz")
- Akadémiai/tudományos stílust
- Hosszú elméleti bevezetéseket

VÁLASZOLJ ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "ideas": [
    {
      "id": "idea-1",
      "title": "Figyelemfelkeltő cím ami tartalmazza az ígéretet",
      "synopsis": "3-4 mondat: Mit tanul meg az olvasó? Milyen konkrét eredményt ér el? Mi az egyedi módszer?",
      "mainElements": ["Kulcstéma 1", "Kulcstéma 2", "Kulcstéma 3"],
      "uniqueSellingPoint": "Az egyedi módszertan neve és a konkrét, mérhető eredmény",
      "mood": "A könyv stílusa 2-3 szóban (pl. gyakorlatias, motiváló, lépésről-lépésre)"
    }
  ]
}`;

    // Retry logic exponenciális backoff-al (429/502/503 kezelés)
    const maxRetries = 5;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
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
        }
        break;
      } catch (fetchError) {
        console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw fetchError;
      }
    }

    if (!response || !response.ok) {
      if (response?.status === 429) return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response?.status === 402) return new Response(JSON.stringify({ error: "Nincs kredit" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response?.status || "unknown"}`);
    }

    const aiData = await response.json();
    let content = aiData.content?.[0]?.text || "";
    
    if (content.startsWith("```json")) content = content.slice(7);
    if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    
    const ideas = JSON.parse(content.trim());

    return new Response(JSON.stringify(ideas), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
