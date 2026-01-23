import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const countWords = (text: string): number => text.trim().split(/\s+/).filter(w => w.length > 0).length;

const SECTION_PROMPTS: Record<string, string> = {
  intro: "Írj bevezető szekciót személyes történettel vagy figyelemfelkeltő problémával. Kezdj hook-kal!",
  concept: "Magyarázd el a fogalmat/módszert egyszerűen és gyakorlatiasan. Használj konkrét példákat.",
  example: "Adj részletes gyakorlati példákat és esettanulmányokat konkrét számokkal és eredményekkel.",
  exercise: "Készíts gyakorlatot vagy önértékelést amit az olvasó azonnal elvégezhet.",
  summary: "Foglald össze a fejezet kulcspontjait bullet point listában. Mit tanult meg az olvasó?",
  case_study: "Írj részletes esettanulmányt valós példával, számokkal és tanulságokkal.",
};

const NONFICTION_SYSTEM_PROMPT = `Te egy bestseller szakkönyv ghostwriter vagy.

STÍLUS SZABÁLYOK (KÖTELEZŐ):
1. Első személy narratíva - "Én", "Mi", "Az én tapasztalatom szerint..."
2. Közvetlen megszólítás - "Te", "Neked", "Ha te is..."
3. Rövid bekezdések - Maximum 3-4 mondat bekezdésenként
4. Zero fluff - Semmi töltelék, minden mondat értéket ad
5. Konkrét számok - "3 lépés", "47%-kal nőtt", "2 hét alatt"
6. Személyes történetek - Valós tapasztalatok a hitelesség érdekében
7. Gyakorlatias tanácsok - Azonnal alkalmazható lépések
8. Kérdések az olvasónak - Bevonás és interakció
9. Átvezetések - Minden szekció végén előrevetítés

NE HASZNÁLJ:
- Fiktív karaktereket vagy szereplőket
- Passzív szerkezetet ("el lett végezve")
- Általános kijelentéseket ("sokan gondolják")
- Akadémiai stílust
- Hosszú, bonyolult mondatokat

FORMÁZÁS:
- Használj alcímeket
- Használj bullet point listákat
- Használj számozott lépéseket ahol releváns
- Emeld ki a kulcsüzeneteket`;

const FICTION_SYSTEM_PROMPT = `Te egy regényíró vagy. Írj élvezetes magyar prózát.

STÍLUS SZABÁLYOK:
- Show, don't tell - Mutasd meg, ne mondd el
- Élénk párbeszédek
- Érzékletes leírások
- Dinamikus cselekmény`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, chapterId, sectionNumber, sectionOutline, previousContent, bookTopic, targetAudience, chapterTitle, genre, authorProfile } = await req.json();
    if (!projectId || !chapterId || !sectionOutline) return new Response(JSON.stringify({ error: "Hiányzó mezők" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const isFiction = genre === "fiction";
    const sectionType = sectionOutline.pov || sectionOutline.type || "concept";
    const systemPrompt = isFiction ? FICTION_SYSTEM_PROMPT : NONFICTION_SYSTEM_PROMPT;
    
    const userPrompt = isFiction
      ? `ÍRD MEG a jelenetet:\n\nFEJEZET: ${chapterTitle}\nJELENET #${sectionNumber}: "${sectionOutline.title}"\nPOV: ${sectionOutline.pov}\nHelyszín: ${sectionOutline.location}\nIdő: ${sectionOutline.time}\nLeírás: ${sectionOutline.description}\nKulcs események: ${(sectionOutline.key_events || []).join(", ")}\nÉrzelmi ív: ${sectionOutline.emotional_arc}\nCélhossz: ~${sectionOutline.target_words} szó${previousContent ? `\n\nElőző tartalom folytatása:\n${previousContent.slice(-1500)}` : ""}`
      : `ÍRD MEG A SZEKCIÓT:

FEJEZET: ${chapterTitle}
SZEKCIÓ #${sectionNumber}: "${sectionOutline.title}"
TÍPUS: ${sectionType}
FELADAT: ${SECTION_PROMPTS[sectionType] || "Írj tartalmas szekciót."}

KULCSPONTOK (mindegyiket dolgozd fel):
${(sectionOutline.key_events || []).map((p: string, i: number) => `${i+1}. ${p}`).join('\n')}

TANULÁSI CÉL: ${sectionOutline.description || "Az olvasó megérti és alkalmazni tudja a tartalmat."}
CÉLKÖZÖNSÉG: ${targetAudience || "Általános"}
KÖNYV TÉMÁJA: ${bookTopic || "Szakkönyv"}
${authorProfile?.formality === "magaz" ? "MEGSZÓLÍTÁS: Magázó forma (Ön)" : "MEGSZÓLÍTÁS: Tegező forma (Te)"}

CÉLHOSSZ: ~${sectionOutline.target_words} szó

${previousContent ? `FOLYTATÁS (illeszkedj az előző tartalomhoz):\n${previousContent.slice(-1500)}` : ""}

FORMÁZÁSI KÖVETELMÉNYEK:
- Használj alcímeket ha a szekció hosszabb
- Használj bullet point listákat a kulcspontoknál
- Használj számozott lépéseket a folyamatoknál
- A szekció végén készíts átvezetést a következőhöz`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        model: "google/gemini-3-flash-preview", 
        messages: [
          { role: "system", content: systemPrompt }, 
          { role: "user", content: userPrompt }
        ], 
        max_tokens: Math.min(sectionOutline.target_words * 2, 6000) 
      }),
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
