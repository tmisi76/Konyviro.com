import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Count words in text
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Parse SSE stream and extract text content
const parseSSEStream = async (response: Response): Promise<string> => {
  const reader = response.body?.getReader();
  if (!reader) return "";
  
  const decoder = new TextDecoder();
  let fullText = "";
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");
    
    for (const line of lines) {
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const json = JSON.parse(line.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
  
  return fullText;
};

// Section type specific prompts
const SECTION_PROMPTS: Record<string, string> = {
  intro: `Ez egy BEVEZETŐ szekció. Szabályok:
- Kezdj egy gondolatébresztő kérdéssel vagy meglepő ténnyel
- Mutasd be, miért fontos ez a téma az olvasónak
- Váltsd ki az olvasó kíváncsiságát
- Vezesd be a fejezet fő témáit
- NE adj még definíciókat vagy mély magyarázatokat`,

  concept: `Ez egy FOGALOM MAGYARÁZÓ szekció. Szabályok:
- Adj világos, pontos definíciókat
- Magyarázd el az elméleti alapokat
- Használj analógiákat a megértéshez
- Építs az egyszerűbből a bonyolultabb felé
- Hivatkozz szakirodalomra ahol releváns`,

  example: `Ez egy PÉLDA szekció. Szabályok:
- Adj konkrét, valós életből vett példákat
- Mutasd be lépésről lépésre a folyamatot
- Használj specifikus számokat és adatokat
- Tedd személyessé és relatívvá az olvasó számára
- Kapcsold össze az elméleti fogalmakkal`,

  exercise: `Ez egy GYAKORLAT szekció. Szabályok:
- Adj világos, megoldható feladatokat
- Fokozatosan növekvő nehézség
- Minden feladathoz adj útmutatást
- Ösztönözd az aktív gondolkodást
- Adj lehetőséget az önellenőrzésre`,

  summary: `Ez egy ÖSSZEFOGLALÓ szekció. Szabályok:
- Sorold fel a kulcspontokat tömören
- Emeld ki a legfontosabb tanulságokat
- Adj gyakorlati alkalmazási tippeket
- Készítsd elő a következő fejezetet
- Zárd inspiráló gondolattal`,

  case_study: `Ez egy ESETTANULMÁNY szekció. Szabályok:
- Írj le egy valós vagy realisztikus szituációt
- Mutasd be a kontextust és a szereplőket
- Elemezd a döntéseket és következményeket
- Vonj le tanulságokat
- Kapcsold az elméleti fogalmakhoz`,
};

const SYSTEM_PROMPT = `Te egy tapasztalt szakkönyv szerző vagy. Feladatod, hogy a megadott szekció-vázlat alapján megírd a szekció teljes szövegét.

ÁLTALÁNOS ÍRÁSI SZABÁLYOK:
- Világos, logikus struktúra
- Magyarázd el a szakkifejezéseket első használatkor
- Didaktikus, de olvasmányos stílus
- Használj bekezdéseket a szöveg tagolására
- A szekció hossza közelítsen a target_words értékhez
- Magyar nyelven írj, szakmai de közérthető stílusban
- Az olvasót tegezd vagy önözd következetesen (inkább tegezd)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      projectId, 
      chapterId,
      sectionNumber,
      sectionOutline,
      previousContent,
      bookTopic,
      targetAudience,
      chapterTitle
    } = await req.json();

    if (!projectId || !chapterId || !sectionOutline) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get section type specific prompt
    const sectionType = sectionOutline.pov || sectionOutline.type || "concept";
    const typePrompt = SECTION_PROMPTS[sectionType] || SECTION_PROMPTS.concept;

    let userPrompt = `ÍRD MEG AZ ALÁBBI SZEKCIÓT:

FEJEZET: ${chapterTitle}
SZEKCIÓ #${sectionNumber}: "${sectionOutline.title}"

SZEKCIÓ TÍPUS: ${sectionType}
${typePrompt}

SZEKCIÓ RÉSZLETEI:
- Tanulási cél: ${sectionOutline.description || sectionOutline.learning_objective}
- Kulcspontok: ${(sectionOutline.key_events || sectionOutline.key_points || []).join(", ")}
- Szükséges példák száma: ${sectionOutline.emotional_arc?.includes("Példák:") ? sectionOutline.emotional_arc.replace("Példák:", "").trim() : "1-2"}
- Célhossz: ~${sectionOutline.target_words} szó

KÖNYV KONTEXTUS:
- Téma: ${bookTopic || "Általános szakkönyv"}
- Célközönség: ${targetAudience || "Általános olvasóközönség"}
`;

    if (previousContent) {
      userPrompt += `
AZ EDDIGI TARTALOM (folytatásként írd):
---
${previousContent}
---
`;
    }

    userPrompt += `
Most írd meg ezt a szekciót! A válasz CSAK a szekció szövege legyen, semmi más megjegyzés vagy formázás.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: Math.min(sectionOutline.target_words * 2, 6000),
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Túl sok kérés. Kérlek várj." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredit elfogyott." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI szolgáltatás hiba" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the stream to get full text for word counting
    const sectionContent = await parseSSEStream(response);
    const wordCount = countWords(sectionContent);
    
    // Update user_usage for billing with extra credit fallback
    if (wordCount > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get user_id from project
      const { data: project } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single();
      
      if (project?.user_id) {
        try {
          // Get current month usage and limits
          const currentMonth = new Date().toISOString().slice(0, 7);
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("monthly_word_limit, extra_words_balance")
            .eq("user_id", project.user_id)
            .single();
          
          const { data: usageData } = await supabase
            .from("user_usage")
            .select("words_generated")
            .eq("user_id", project.user_id)
            .eq("month", currentMonth)
            .single();
          
          const monthlyLimit = profile?.monthly_word_limit || 5000;
          const currentUsage = usageData?.words_generated || 0;
          const extraBalance = profile?.extra_words_balance || 0;
          const remainingMonthly = Math.max(0, monthlyLimit - currentUsage);
          
          if (monthlyLimit === -1) {
            // Unlimited plan - just track usage
            await supabase.rpc('increment_words_generated', {
              p_user_id: project.user_id,
              p_word_count: wordCount
            });
          } else if (wordCount <= remainingMonthly) {
            // Fits within monthly limit
            await supabase.rpc('increment_words_generated', {
              p_user_id: project.user_id,
              p_word_count: wordCount
            });
          } else {
            // Need to use extra credits
            const fromMonthly = remainingMonthly;
            const fromExtra = wordCount - remainingMonthly;
            
            // Track what we used from monthly
            if (fromMonthly > 0) {
              await supabase.rpc('increment_words_generated', {
                p_user_id: project.user_id,
                p_word_count: fromMonthly
              });
            }
            
            // Use extra credits for the rest
            if (fromExtra > 0 && extraBalance > 0) {
              const toDeduct = Math.min(fromExtra, extraBalance);
              await supabase.rpc('use_extra_credits', {
                p_user_id: project.user_id,
                p_word_count: toDeduct
              });
              console.log(`Used ${toDeduct} extra credits for user ${project.user_id}`);
            }
          }
          
          console.log(`Word usage tracked: ${wordCount} words for user ${project.user_id}`);
        } catch (usageError) {
          console.error('Failed to update word usage:', usageError);
        }
      }
    }
    
    // Return the content as JSON
    return new Response(
      JSON.stringify({ content: sectionContent, wordCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Write section error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
