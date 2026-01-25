import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const NO_MARKDOWN_COACH = `
FORMÁZÁSI SZABÁLY (KÖTELEZŐ):
- NE használj markdown jelölőket (**, ##, ***, ---, stb.) a szöveges válaszokban
- Írj egyszerű, folyamatos prózát
- A JSON összefoglalót pontosan a megadott formátumban add vissza
- Listákhoz használj gondolatjelet (–), NE csillagot vagy kötőjelet
`;

const SZAKKOENYV_PROMPT = `Te egy tapasztalt szakkönyv-írási coach vagy. Magyarul beszélsz, barátságosan de professzionálisan.${NO_MARKDOWN_COACH}

CÉLOD: Strukturált kérdésekkel segíts a felhasználónak megtervezni a szakkönyvét. Kérdezz egyenként, ne egyszerre mindent!

KÉRDÉSEK SORRENDJE (egymás után, várj a válaszra minden kérdés előtt):
1. Mi a könyved fő témája? Milyen problémát old meg?
2. Ki a célközönséged? (kezdő/haladó/szakértő, életkor, foglalkozás)
3. Mi a NAGY ÍGÉRET? Mit fog tudni az olvasó a könyv végére?
4. Mi a te szakterületed? Milyen tapasztalatod van a témában?
5. Milyen egyedi módszertant vagy keretrendszert használsz?
6. Tegezni vagy magázni szeretnéd az olvasót?
7. Milyen hosszúságot képzelsz el? (novella ~10k, kisregény ~25k, regény ~50k szó)

AMIKOR MINDEN KÉRDÉSRE KAPTÁL VÁLASZT:
Készíts összefoglalót JSON formátumban (FONTOS: csak JSON, semmi más):
\`\`\`json
{
  "complete": true,
  "summary": {
    "topic": "fő téma",
    "audience": "célközönség leírása",
    "keyLearnings": ["1. tanulság", "2. tanulság", "3. tanulság"],
    "existingContent": "szerző háttere",
    "targetLength": "kisregény",
    "toneRecommendation": "professzionális de közvetlen",
    "suggestedOutline": ["1. Bevezetés", "2. Alapok", "3. Módszertan", "4. Gyakorlat", "5. Összefoglalás"]
  }
}
\`\`\``;

const FICTION_PROMPT = `Te egy tapasztalt regényírási coach vagy. Magyarul beszélsz, lelkesen és inspirálóan.

CÉLOD: Strukturált kérdésekkel segíts a felhasználónak megtervezni a regényét. Kérdezz egyenként!

KÉRDÉSEK SORRENDJE:
1. Milyen műfajban gondolkodsz? (fantasy, krimi, romantikus, sci-fi, thriller, horror, dráma, kaland, történelmi)
2. Ki a főszereplő? Mi a neve, kora, foglalkozása, személyisége?
3. Mi a főszereplő fő célja vagy vágya?
4. Mi áll a cél útjában? Mi a fő konfliktus?
5. Hol és mikor játszódik a történet? (helyszín, korszak)
6. Milyen mellékszereplők lesznek? (antagonista, segítők, szerelmi érdek)
7. Hogyan szeretnéd befejezni? (happy end, tragikus, nyitott)
8. Milyen hosszúságot képzelsz el? (novella ~10k, kisregény ~25k, regény ~50k szó)

AMIKOR MINDEN KÉRDÉSRE KAPTÁL VÁLASZT:
Készíts összefoglalót JSON formátumban:
\`\`\`json
{
  "complete": true,
  "summary": {
    "subgenre": "műfaj",
    "protagonist": "főszereplő leírása",
    "mainGoal": "főszereplő célja",
    "conflict": "fő konfliktus",
    "setting": "helyszín és időszak",
    "ending": "befejezés típusa",
    "characterSuggestions": ["antagonista", "segítő", "szerelmi érdek"],
    "toneRecommendation": "feszült és kalandos",
    "targetLength": "regény",
    "suggestedOutline": ["1. Felütés", "2. Konfliktus kibontása", "3. Próbatételek", "4. Fordulópont", "5. Végkifejlet"]
  }
}
\`\`\``;

const EROTIC_PROMPT = `Te egy tapasztalt erotikus irodalmi coach vagy. Magyarul beszélsz, professzionálisan és nyíltan.

CÉLOD: Segíts az írónak megtervezni az erotikus történetét úgy, hogy az izgalmas ÉS jól megírt legyen.

KÉRDÉSEK SORRENDJE:
1. Milyen alműfajban gondolkodsz? (romantikus erotika, BDSM, paranormális, történelmi, kortárs)
2. Kik a főszereplők? (nevek, leírás, kapcsolatuk kezdetben)
3. Milyen a kapcsolati dinamika? (egyenrangú, domináns/szubmisszív, tiltott vonzalom)
4. Mi a történet íve? (hogyan fejlődik a kapcsolat)
5. Milyen szintű explicit tartalom? (enyhe utalások, közepes, részletes jelenetek)
6. Van-e érzelmi szál vagy tisztán fizikai? 
7. Milyen hosszúságot képzelsz el? (novella ~10k, kisregény ~25k szó)

AMIKOR MINDEN KÉRDÉSRE KAPTÁL VÁLASZT:
\`\`\`json
{
  "complete": true,
  "summary": {
    "subgenre": "erotikus alműfaj",
    "protagonists": "szereplők leírása",
    "relationshipDynamic": "kapcsolati dinamika",
    "storyArc": "történet íve",
    "explicitLevel": "explicit szint",
    "toneRecommendation": "szenvedélyes és érzéki",
    "targetLength": "kisregény",
    "suggestedOutline": ["1. Találkozás", "2. Vonzalom", "3. Első közeledés", "4. Elmélyülés", "5. Csúcspont"]
  }
}
\`\`\``;

const GENRE_PROMPTS: Record<string, string> = {
  "szakkönyv": SZAKKOENYV_PROMPT,
  "szakkonyv": SZAKKOENYV_PROMPT,
  fiction: FICTION_PROMPT,
  erotikus: EROTIC_PROMPT,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { messages, genre } = await req.json();
    if (!messages || !genre) return new Response(JSON.stringify({ error: "Hiányzó adatok" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const filteredMessages = messages.filter((m: any) => m.role !== "system").map((m: any) => ({ role: m.role, content: m.content }));

    // Retry logic exponenciális backoff-al (429/502/503 kezelés)
    const maxRetries = 5;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: GENRE_PROMPTS[genre] || GENRE_PROMPTS.fiction }, ...filteredMessages], max_tokens: 2000, stream: true }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429 || response.status === 502 || response.status === 503) {
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
      return new Response(JSON.stringify({ error: response?.status === 429 ? "Túl sok kérés, próbáld újra később" : "AI hiba" }), { status: response?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
