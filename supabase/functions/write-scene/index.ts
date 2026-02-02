import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Word-compatible counting: only tokens containing at least one letter
const countWords = (t: string) => t.trim().split(/\s+/).filter(w => /[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(w)).length;

// Universal fiction writing rules
const UNIVERSAL_FICTION_RULES = `
## FŐ ÍRÓI SZABÁLYOK:
- Mutass, ne mondj! ("Show, don't tell") - Érzéseket, gondolatokat cselekvésen és testi reakciókon keresztül mutasd be
- Írj élethű, természetes párbeszédeket - minden szereplőnek legyen saját hangja
- Építs feszültséget fokozatosan
- Használj érzékletes leírásokat: szagok, hangok, textúrák, nem csak vizuális
- A szereplők NEM tökéletesek - legyenek hibáik, belső konfliktusaik
- Kerüld a klisés fordulatokat és a kiszámítható megoldásokat
- Minden fejezetnek legyen "hook"-ja a végén, ami tovább viszi az olvasót

## FORMÁZÁS (KRITIKUS - KÖTELEZŐ):
- NE HASZNÁLJ markdown szintaxist (**, ##, ***, ---, \`\`\`, stb.)
- Írj tiszta, formázatlan prózát jelölések nélkül
- Párbeszédeknél használj magyar idézőjeleket: „szöveg"
- Gondolatjel: – (nem -)
- A szöveg folyamatos, olvasható próza legyen, semmilyen jelöléssel

## MAGYAR NYELVI SZABÁLYOK (KÖTELEZŐ):

NÉVSORREND: Magyar névsorrend: Vezetéknév + Keresztnév (pl. "Kovács János", NEM "János Kovács").

PÁRBESZÉD FORMÁZÁS:
- Magyar párbeszédjelölés: gondolatjel (–) a sor elején
- Idézőjel használata: „..." (magyar idézőjel, NEM "...")
- Példa helyes formátum:
  – Hová mész? – kérdezte Anna.
  – A boltba – válaszolta.

ÍRÁSJELEK:
- Gondolatjel: – (hosszú, NEM -)
- Három pont: ... (NEM …)
- Vessző MINDIG a kötőszavak előtt: "de, hogy, mert, ha, amikor, amely, ami"

KERÜLENDŐ HIBÁK:
- NE használj angolszász névsorrendet
- NE használj tükörfordításokat ("ez csinál értelmet" → "ennek van értelme")
- NE használj angol idézőjeleket ("..." → „...")
- NE használj felesleges névelőket angolosan

NYELVTANI HELYESSÉG:
- Ragozás: ügyelj a magyar ragozás helyességére
- Szórend: magyar szórend, NEM angol (ige-alany-tárgy)
- Összetett szavak: egybe vagy külön az MTA szabályai szerint
`;

// Genre-specific prompts
const GENRE_PROMPTS: Record<string, string> = {
  thriller: `
## THRILLER SZABÁLYOK:
- Minden fejezetnek emelje a tétet
- "Ticking clock" elem: legyen időnyomás
- Red herring-ek: hints félrevezető nyomokat
- A főhős legyen aktív, ne csak passzívan elszenvedje az eseményeket
- Információt adagolj óvatosan - az olvasó mindig csak egy lépéssel járjon a főhős mögött
- Cliffhangerek a fejezetek végén
- A végső csavar legyen fair: visszanézve legyenek a jelek, de ne legyen kiszámítható`,

  krimi: `
## KRIMI SZABÁLYOK:
- A nyomok legyenek fair play szerint elrejtve - az olvasó is megoldhassa
- Építs gyanút több szereplő köré
- A detektív módszere legyen következetes és jellemző rá
- A megoldás legyen logikus, de meglepő
- A motiváció legyen emberi és hihető`,

  horror: `
## HORROR SZABÁLYOK:
- A félelem a NEM LÁTOTTBÓL jön - csak sejtesd, ne mutass mindent
- Használd a "wrongness" érzést - valami nincs rendben, de nem tudni mi
- Építs hamis biztonságérzeteket, majd rombold le
- A hétköznapi dolgok legyenek félelmetesek (uncanny)
- Izoláció: a főhős legyen egyedül a bajban
- "Slow burn": a horror fokozatosan épüljön, ne rögtön 100-on induljon
- Az olvasó képzelete a legerősebb fegyver - hagyd dolgozni`,

  erotikus: `
## INTIM JELENETEK SZABÁLYAI:
- Az erotikus jelenetek NE legyenek öncélúak - vigyék előre a kapcsolatot vagy a cselekményt
- Használj változatos szókincset - kerüld az ismétlést
- Fókuszálj az érzésekre, érzelmekre, nem csak a fizikai aktusra
- Építs feszültséget a jelenet ELŐTT (anticipation)
- A beleegyezés legyen egyértelmű, de ne legyen mesterkélt
- A karakterek személyisége tükröződjön az intimitásukban is
- Váltogasd a tempót: lassú, érzéki pillanatok + intenzív pillanatok`,

  romantikus: `
## ROMANTIKUS SZABÁLYOK:
- Építsd a kémiát fokozatosan - ne siess a "nagy pillanattal"
- A szerelmi szál mellett legyen egyéni fejlődési ív mindkét karakternek
- Használj "almost but not quite" pillanatokat a feszültségépítéshez
- A félreértések legyenek valósak, ne mesterségesek
- Mutasd a sebezhetőséget és a bizalom kiépülését
- A HEA (Happy Ever After) felé vezető út legyen izgalmas és kihívásokkal teli`,

  fantasy: `
## FANTASY SZABÁLYOK:
- A mágia legyen következetes szabályokkal
- A világépítés legyen organikus - ne info-dumpelj
- Az idegen elemek (lények, kultúrák) legyenek belülről logikusak
- A főhős ereje legyen kiérdemelt, ne "chosen one" cliché
- A konfliktusok legyenek személyesek is, ne csak epikusak`,

  scifi: `
## SCI-FI SZABÁLYOK:
- A technológia legyen következetes és belülről logikus
- A tudományos elemek szolgálják a történetet, ne fordítva
- Mutasd a technológia társadalmi hatásait
- Az ember maradjon a középpontban, ne a kütyük
- "One big lie" szabály: egy fő spekulatív elem körül építkezz`,

  drama: `
## DRÁMA SZABÁLYOK:
- A karakterfejlődés legyen a középpontban
- A konfliktusok legyenek belső és külső szinten is jelen
- Kerüld a melodrámát - a fájdalom legyen valódi, ne túljátszott
- A párbeszédek legyenek rétegzettek - amit mondanak vs. amit gondolnak
- A katarzis legyen megérdemelt és felépített`,

  kaland: `
## KALAND SZABÁLYOK:
- Tartsd fenn a lendületet - valami mindig történjen
- A veszélyek legyenek valósak, legyen tétje a cselekménynek
- A főhős legyen találékony és aktív
- A helyszínek legyenek karakteresek és emlékezetesek
- Az akciók legyenek vizuálisan elképzelhetők`,

  tortenelmi: `
## TÖRTÉNELMI SZABÁLYOK:
- A korszak légköre legyen hiteles - nyelvezet, szokások, tárgyak
- Ne modernizáld túl a karakterek gondolkodását
- A történelmi események szolgálják a személyes történetet
- A részletek legyenek pontosak, de ne lecke-szerűek
- Mutasd a mindennapi életet, ne csak a nagy eseményeket`,
};

// POV labels for prompt
const POV_LABELS: Record<string, string> = {
  first_person: "Első személy (Én-elbeszélő)",
  third_limited: "Harmadik személy, korlátozott nézőpont",
  third_omniscient: "Harmadik személy, mindentudó narrátor",
  multiple: "Váltakozó nézőpont",
};

const PACE_LABELS: Record<string, string> = {
  slow: "Lassú - részletes leírások, atmoszféra-építés",
  moderate: "Közepes - kiegyensúlyozott ritmus",
  fast: "Gyors - akciódús, dinamikus",
  variable: "Változó - feszültséghez igazodó tempó",
};

const DIALOGUE_LABELS: Record<string, string> = {
  minimal: "Kevés párbeszéd - főleg narráció",
  balanced: "Kiegyensúlyozott párbeszéd-narráció arány",
  heavy: "Sok párbeszéd - párbeszéd-központú",
};

const DESCRIPTION_LABELS: Record<string, string> = {
  sparse: "Minimális leírás - akció fókusz",
  moderate: "Közepes leírás - kulcsjelenetek részletezve",
  rich: "Gazdag leírás - érzékletes, atmoszférikus",
};

// Base prompts
const PROMPTS: Record<string, string> = {
  fiction: "Te egy tehetséges, bestsellereket író regényíró vagy. Írj élénk, képszerű magyar prózát.",
  erotikus: "Te egy tehetséges erotikus regényíró vagy. Írj érzéki, szenvedélyes magyar prózát.",
  szakkonyv: "Te egy szakkönyv szerző vagy. Írj világos, strukturált magyar szöveget.",
};

// Build style profile prompt section
const buildStylePrompt = (styleProfile: Record<string, unknown> | null): string => {
  if (!styleProfile || !styleProfile.style_summary) return "";
  
  const parts: string[] = ["\n\n--- FELHASZNÁLÓ ÍRÓI STÍLUSA ---"];
  parts.push(`Stílus összefoglaló: ${styleProfile.style_summary}`);
  
  if (styleProfile.avg_sentence_length) {
    parts.push(`Átlagos mondathossz: ${styleProfile.avg_sentence_length} szó`);
  }
  if (styleProfile.vocabulary_complexity) {
    const complexity = Number(styleProfile.vocabulary_complexity);
    const level = complexity < 4 ? "egyszerű" : complexity < 7 ? "közepes" : "összetett";
    parts.push(`Szókincs komplexitás: ${level}`);
  }
  if (styleProfile.dialogue_ratio) {
    parts.push(`Párbeszéd arány: ${Math.round(Number(styleProfile.dialogue_ratio) * 100)}%`);
  }
  if (styleProfile.common_phrases && Array.isArray(styleProfile.common_phrases)) {
    parts.push(`Jellemző kifejezések: ${styleProfile.common_phrases.slice(0, 10).join(", ")}`);
  }
  
  parts.push("FONTOS: Utánozd a fenti stílus jegyeket!");
  parts.push("--- STÍLUS VÉGE ---");
  
  return parts.join("\n");
};

// Build fiction style prompt section
const buildFictionStylePrompt = (fictionStyle: Record<string, unknown> | null, subcategory: string | null): string => {
  if (!fictionStyle) return "";
  
  const parts: string[] = ["\n\n## ÍRÓI STÍLUS BEÁLLÍTÁSOK:"];
  
  if (fictionStyle.pov) {
    parts.push(`- Nézőpont: ${POV_LABELS[fictionStyle.pov as string] || fictionStyle.pov}`);
  }
  if (fictionStyle.pace) {
    parts.push(`- Tempó: ${PACE_LABELS[fictionStyle.pace as string] || fictionStyle.pace}`);
  }
  if (fictionStyle.dialogueRatio) {
    parts.push(`- Párbeszédek: ${DIALOGUE_LABELS[fictionStyle.dialogueRatio as string] || fictionStyle.dialogueRatio}`);
  }
  if (fictionStyle.descriptionLevel) {
    parts.push(`- Leírások: ${DESCRIPTION_LABELS[fictionStyle.descriptionLevel as string] || fictionStyle.descriptionLevel}`);
  }
  if (fictionStyle.setting) {
    parts.push(`- Helyszín/korszak: ${fictionStyle.setting}`);
  }
  
  // Add genre-specific rules
  const genrePrompt = subcategory ? GENRE_PROMPTS[subcategory] : null;
  if (genrePrompt) {
    parts.push(genrePrompt);
  }
  
  // Add universal fiction rules
  parts.push(UNIVERSAL_FICTION_RULES);
  
  return parts.join("\n");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, chapterId, sceneNumber, sceneOutline, previousContent, characters, storyStructure, genre, chapterTitle, subcategory, targetSceneWords, characterHistory } = await req.json();
    
    if (!projectId || !chapterId || !sceneOutline) {
      return new Response(JSON.stringify({ error: "Hiányzó mezők" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "AI nincs konfigurálva" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch user style profile and fiction style settings for the project owner
    let stylePrompt = "";
    let fictionStylePrompt = "";
    const { data: project } = await supabase
      .from("projects")
      .select("user_id, fiction_style, subcategory")
      .eq("id", projectId)
      .single();

    if (project?.user_id) {
      const { data: styleProfile } = await supabase
        .from("user_style_profiles")
        .select("*")
        .eq("user_id", project.user_id)
        .single();

      if (styleProfile?.style_summary) {
        stylePrompt = buildStylePrompt(styleProfile);
      }
    }

    // Add fiction style if available
    const projectSubcategory = subcategory || project?.subcategory;
    if (project?.fiction_style) {
      fictionStylePrompt = buildFictionStylePrompt(project.fiction_style, projectSubcategory);
    }

    const basePrompt = PROMPTS[genre] || PROMPTS.fiction;
    const systemPrompt = basePrompt + fictionStylePrompt + stylePrompt;

    // Calculate effective target words (from request or scene outline)
    const effectiveTargetWords = targetSceneWords || sceneOutline.target_words || 500;
    
    // Dynamic max_tokens based on target (Hungarian: ~1.3 tokens per word)
    const dynamicMaxTokens = Math.min(Math.max(effectiveTargetWords * 2, 1024), 8192);

    // Build character history context if available
    let characterHistoryContext = "";
    if (characterHistory && typeof characterHistory === "object" && Object.keys(characterHistory).length > 0) {
      characterHistoryContext = "\n\n--- KARAKTER ELŐZMÉNYEK ---\nAz alábbi karakterek mit csináltak az előző fejezetekben:\n" +
        Object.entries(characterHistory)
          .map(([name, actions]) => `**${name}**:\n${(actions as string[]).slice(-5).map(a => `- ${a}`).join("\n")}`)
          .join("\n\n") +
        "\n\nFONTOS: Tartsd szem előtt ezeket az előzményeket! A karakterek NE ismételjék meg, amit már megtettek, és NE mutatkozzanak be újra!\n---";
    }

    const prompt = `ÍRD MEG: ${chapterTitle} - Jelenet #${sceneNumber}: "${sceneOutline.title}"

FONTOS: Ez a jelenet MAXIMUM ${effectiveTargetWords} szó legyen! Ne írj többet!

POV: ${sceneOutline.pov}
Helyszín: ${sceneOutline.location}
Mi történik: ${sceneOutline.description}
Kulcsesemények: ${sceneOutline.key_events?.join(", ")}
Célhossz: ~${effectiveTargetWords} szó (NE LÉPD TÚL!)${characters ? `\nKarakterek: ${characters}` : ""}${characterHistoryContext}${previousContent ? `\n\nFolytatás:\n${previousContent.slice(-1500)}` : ""}`;

    // Rock-solid retry logic with max resilience
    const maxRetries = 7;
    const MAX_TIMEOUT = 120000; // 2 minutes timeout
    let lastError: Error | null = null;
    let content = "";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT);

        console.log(`AI request attempt ${attempt}/${maxRetries} for scene ${sceneNumber}`);

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: dynamicMaxTokens,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limit (429), gateway errors (502/503/504)
        if (response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504 || response.status === 529) {
          const statusText = response.status === 429 ? "Rate limit" : `Gateway ${response.status}`;
          console.error(`${statusText} (attempt ${attempt}/${maxRetries})`);
          
          if (attempt < maxRetries) {
            // Exponential backoff: 5s, 10s, 20s, 40s, 60s, 60s, 60s
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            console.log(`Waiting ${delay/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: "Az AI szolgáltatás túlterhelt. Próbáld újra pár másodperc múlva." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!response.ok) {
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "Nincs elegendő kredit." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const errorText = await response.text();
          console.error("AI gateway error:", response.status, errorText.substring(0, 200));
          
          // Retry on 5xx errors
          if (response.status >= 500 && attempt < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          return new Response(JSON.stringify({ error: "AI szolgáltatás hiba" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Parse response safely
        let aiData;
        try {
          aiData = await response.json();
        } catch (parseError) {
          console.error(`JSON parse error (attempt ${attempt}/${maxRetries}):`, parseError);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Hibás API válasz formátum");
        }

        content = aiData.content?.[0]?.text || "";

        // Retry on empty or too short response (minimum 100 chars for a valid scene)
        if (!content || content.trim().length < 100) {
          console.warn(`Empty/too short AI response (attempt ${attempt}/${maxRetries}), length: ${content?.length || 0}`);
          if (attempt < maxRetries) {
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("Az AI nem tudott megfelelő választ generálni");
        }

        // Success - exit retry loop
        console.log(`AI response received, length: ${content.length}`);
        break;

      } catch (fetchError) {
        lastError = fetchError as Error;
        if ((fetchError as Error).name === "AbortError") {
          console.error(`Request timeout after ${MAX_TIMEOUT/1000}s (attempt ${attempt}/${maxRetries})`);
        } else {
          console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
        }
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return new Response(JSON.stringify({ error: "A generálás időtúllépés miatt sikertelen. Próbáld újra." }), {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!content || content.trim().length < 100) {
      console.error("All retry attempts failed:", lastError?.message);
      return new Response(JSON.stringify({ error: "A generálás sikertelen. Próbáld újra." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!content) {
      throw new Error("Generálás sikertelen");
    }

    const wordCount = countWords(content);

    // Update usage
    if (project?.user_id && wordCount > 0) {
      const month = new Date().toISOString().slice(0, 7);
      const { data: profile } = await supabase
        .from("profiles")
        .select("monthly_word_limit, extra_words_balance")
        .eq("user_id", project.user_id)
        .single();
      const { data: usage } = await supabase
        .from("user_usage")
        .select("words_generated")
        .eq("user_id", project.user_id)
        .eq("month", month)
        .single();

      const limit = profile?.monthly_word_limit || 5000;
      const used = usage?.words_generated || 0;
      const extra = profile?.extra_words_balance || 0;
      const remaining = Math.max(0, limit - used);

      // Service role: update usage directly instead of using RPC (which now requires auth.uid())
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (limit === -1 || wordCount <= remaining) {
        // Add to monthly usage
        await supabase.from("user_usage").upsert({
          user_id: project.user_id,
          month: currentMonth,
          words_generated: (usage?.words_generated || 0) + wordCount,
          projects_created: 0
        }, { onConflict: "user_id,month" });
      } else {
        if (remaining > 0) {
          await supabase.from("user_usage").upsert({
            user_id: project.user_id,
            month: currentMonth,
            words_generated: (usage?.words_generated || 0) + remaining,
            projects_created: 0
          }, { onConflict: "user_id,month" });
        }
        const fromExtra = Math.min(wordCount - remaining, extra);
        if (fromExtra > 0) {
          await supabase.from("profiles")
            .update({ extra_words_balance: extra - fromExtra, updated_at: new Date().toISOString() })
            .eq("user_id", project.user_id);
        }
      }
    }

    return new Response(JSON.stringify({ content, wordCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Hiba";
    console.error("Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
