import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildInvestigativeResearchBlock } from "../_shared/prompt-builder.ts";
import { getModelForTask } from "../_shared/ai-settings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_MODEL = await getModelForTask("structural");
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

    const { genre, subcategory, tone, length, targetAudience, additionalInstructions, storyDescription, authorProfile, previousIdeas, nonfictionBookType, bookTypeSpecificData, realCaseResearch } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFiction = genre === "fiction";
    const isInvestigative = nonfictionBookType === "investigative";
    
    // Valós kutatási dossier (Perplexity) blokk az investigative ágban
    const researchBlock = (isInvestigative && realCaseResearch?.research)
      ? buildInvestigativeResearchBlock(realCaseResearch.research, realCaseResearch.sources)
      : "";

    // Könyvtípus kontextus építés
    const bookTypeContext = nonfictionBookType && !isFiction
      ? (() => {
          const typeLabels: Record<string, string> = {
            "how-to": "How-To Útmutató", "thought-leadership": "Thought Leadership",
            "case-study": "Esettanulmány alapú", "framework": "Framework / Módszertan",
            "self-help": "Önfejlesztő", "storytelling-business": "Storytelling üzleti",
            "interview": "Interjú / Beszélgetések", "workbook": "Workbook / Munkafüzet",
            "reference": "Kézikönyv / Referencia", "memoir": "Memoir + Tanulságok",
            "investigative": "Oknyomozó tényfeltáró könyv",
          };
          let ctx = `\nKÖNYV TÍPUSA: ${typeLabels[nonfictionBookType] || nonfictionBookType}`;
          if (bookTypeSpecificData) {
            const d = bookTypeSpecificData;
            if (d.investigationSubject) ctx += `\nVizsgált alany/ügy: ${d.investigationSubject}`;
            if (d.investigatorRole) ctx += `\nOknyomozó szerepe: ${d.investigatorRole}`;
            if (d.evidenceTypes) ctx += `\nBizonyítékok típusai: ${d.evidenceTypes}`;
            if (d.timeline) ctx += `\nIdővonal: ${d.timeline}`;
            if (d.skillOutcome) ctx += `\nElsajátítandó skill: ${d.skillOutcome}`;
            if (d.bigIdea) ctx += `\nFő gondolat: ${d.bigIdea}`;
            if (d.methodologyName) ctx += `\nMódszertan neve: ${d.methodologyName}`;
            if (d.promisedChange) ctx += `\nÍgért változás: ${d.promisedChange}`;
            if (d.thesisToProve) ctx += `\nBizonyítandó tézis: ${d.thesisToProve}`;
          }
          return ctx;
        })()
      : "";

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
      : isInvestigative
      ? `Te egy oknyomozó újságíró vagy, aki tényfeltáró könyveket ír${authorProfile?.authorName ? ` ${authorProfile.authorName} nevében` : ""}.

OKNYOMOZÓ KÖNYV SZABÁLYOK:
- Dokumentumfilm-szerű narratíva, az oknyomozó szemszögéből
- Kronológikus feltárás: Hook → Háttér → Nyomozás → Fordulópontok → Következmények → Tanulságok
- Inline bizonyítékok: dátumok, idézetek, dokumentumok hivatkozása
- Feszültségteli de tényalapú dramatizálás
- NE használj marketing nyelvet, NE adj tanácsokat — ez nem önfejlesztő könyv
- A cél: FELTÁRÁS, LELEPLEZÉS, IGAZSÁG

Mindig érvényes JSON-t adj vissza.`
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
      : isInvestigative
      ? `Generálj 3 egyedi OKNYOMOZÓ TÉNYFELTÁRÓ KÖNYV ötletet a következő paraméterek alapján:
${storyDescriptionClause}
${bookTypeContext}
${researchBlock}

Téma: ${subcategory}
Hangnem: ${tone}
Hossz: ${length === "short" ? "rövid (~30k szó)" : length === "medium" ? "közepes (~60k szó)" : "hosszú (~100k szó)"}
${targetAudience ? `Célközönség: ${targetAudience}` : ""}
${authorProfile?.authorBackground ? `Szerző háttere: ${authorProfile.authorBackground}` : ""}
${additionalInstructions ? `Extra instrukciók: ${additionalInstructions}` : ""}
${previousIdeasClause}

EZ OKNYOMOZÓ TÉNYFELTÁRÓ KÖNYV! NEM marketing, NEM önfejlesztő, NEM how-to!

KÖTELEZŐ ELEMEK MINDEN ÖTLETHEZ:
1. KONKRÉT ÜGY/SKANDAL - Valós esemény(ek) feltárása
2. NYOMOZÁSI SZÁLAK - Milyen irányokból közelíti meg
3. BIZONYÍTÉKOK - Dokumentumok, vallomások, adatok
4. LELEPLEZÉS - Mi az a megdöbbentő igazság amit feltár
5. KÖVETKEZMÉNYEK - Milyen hatással volt/van a társadalomra

STÍLUS: Dokumentumfilm-szerű, feszültségteli, tényalapú

VÁLASZOLJ ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "ideas": [
    {
      "id": "idea-1",
      "title": "Figyelemfelkeltő, leleplező cím",
      "synopsis": "3-4 mondat: Mit tár fel? Milyen bizonyítékokra épül? Miért fontos?",
      "mainElements": ["Nyomozási szál 1", "Nyomozási szál 2", "Nyomozási szál 3"],
      "uniqueSellingPoint": "Milyen megdöbbentő leleplezést ígér a könyv",
      "mood": "A könyv hangulata 2-3 szóban (pl. feszült, leleplező, drámai)"
    }
  ]
}`
      : `Generálj 3 egyedi SZAKKÖNYV ötletet a következő paraméterek alapján:
${storyDescriptionClause}
${bookTypeContext}

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

        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: AI_MODEL,
            max_tokens: 2000,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
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
    let content = aiData.choices?.[0]?.message?.content || "";
    
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
