import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Credit multiplier: 8% of word count
const PROOFREADING_CREDIT_MULTIPLIER = 0.08;
const PROOFREADING_MIN_CREDITS = 100; // Lower minimum for single chapter

function calculateChapterCredits(wordCount: number): number {
  const calculated = Math.round(wordCount * PROOFREADING_CREDIT_MULTIPLIER);
  return Math.max(calculated, PROOFREADING_MIN_CREDITS);
}

const PROOFREADING_SYSTEM_PROMPT = `Feladat: Az alábbi szöveget kell nyelvtanilag és stilisztikailag tökéletesre javítanod. A tartalomhoz tilos hozzányúlnod, csak a formát és a helyességet kezeld.

Szigorú javítási szabályok:

Névsorrend: Ha angolszász névsorrendet találsz (pl. "Balázs György" mint keresztnév-vezetéknév), azt fordítsd át magyarosra (Vezetéknév Keresztnév), amennyiben a szövegkörnyezetből egyértelmű, hogy magyarról van szó.

Anglicizmusok: A "Hunglish" (tükörfordított) kifejezéseket cseréld le természetes, idiomatikus magyar fordulatokra (pl. "ez nem csinál értelmet" -> "ennek nincs értelme").

Helyesírás: Javítsd az elütéseket, vesszőhibákat, egybe- és különírási hibákat.

TILTÁS:

NE írj hozzá új mondatokat.

NE egészítsd ki a szöveget saját ötletekkel.

NE változtasd meg a történet menetét.

Ha egy mondat hiányosnak tűnik, hagyd úgy vagy zárd le nyelvtanilag helyesen a meglévő szavakból, de ne találj ki hozzá új tartalmat.

Kimenet: Kizárólag a javított szöveget add vissza.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header missing");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    const { chapterId } = await req.json();
    
    if (!chapterId) {
      throw new Error("Chapter ID is required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get chapter with project ownership check
    const { data: chapter, error: chapterError } = await supabaseAdmin
      .from("chapters")
      .select("id, title, content, word_count, project_id, projects!inner(user_id)")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapter) {
      throw new Error("Chapter not found");
    }

    const project = (chapter as any).projects;
    if (project.user_id !== user.id) {
      throw new Error("You don't have permission to access this chapter");
    }

    if (!chapter.content || chapter.content.trim().length === 0) {
      throw new Error("A fejezet üres, nincs mit lektorálni");
    }

    const wordCount = chapter.word_count || 0;
    if (wordCount < 50) {
      throw new Error("A fejezet túl rövid a lektoráláshoz (min. 50 szó)");
    }

    // Calculate credit cost
    const creditsNeeded = calculateChapterCredits(wordCount);

    // Check user's credit balance
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("extra_words_balance, monthly_word_limit")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      throw new Error("Failed to fetch user profile");
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabaseAdmin
      .from("user_usage")
      .select("words_generated")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .single();

    const monthlyUsed = usage?.words_generated || 0;
    const monthlyRemaining = Math.max(0, profile.monthly_word_limit - monthlyUsed);
    const totalAvailable = monthlyRemaining + profile.extra_words_balance;

    if (totalAvailable < creditsNeeded) {
      throw new Error(`Nincs elég kredit! Szükséges: ${creditsNeeded}, elérhető: ${totalAvailable}`);
    }

    // Deduct credits
    let remainingToDeduct = creditsNeeded;
    
    if (monthlyRemaining > 0) {
      const deductFromMonthly = Math.min(remainingToDeduct, monthlyRemaining);
      remainingToDeduct -= deductFromMonthly;
      
      await supabaseAdmin.rpc('increment_words_generated', {
        p_user_id: user.id,
        p_word_count: deductFromMonthly,
      });
    }

    if (remainingToDeduct > 0) {
      await supabaseAdmin.rpc('use_extra_credits', {
        p_user_id: user.id,
        p_word_count: remainingToDeduct,
      });
    }

    // Use Claude Sonnet 4.5 via Anthropic API
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    console.log(`[PROOFREAD-CHAPTER] Starting for chapter "${chapter.title}" with ${wordCount} words, model: claude-sonnet-4-20250514`);

    // Call Anthropic API with streaming
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 32000,
        stream: true,
        system: PROOFREADING_SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Lektoráld a következő fejezetet: "${chapter.title}"\n\n${chapter.content}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      throw new Error("AI service error");
    }

    // Stream the response back
    const encoder = new TextEncoder();
    let fullContent = "";
    
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const json = JSON.parse(line.slice(6));
                  // Anthropic streaming format: content_block_delta with text
                  const content = json.delta?.text || json.content_block?.text;
                  if (content) {
                    fullContent += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }

          // Update chapter with final content
          if (fullContent.length > 0) {
            const newWordCount = fullContent.split(/\s+/).filter(w => w.length > 0).length;
            
            await supabaseAdmin
              .from("chapters")
              .update({
                content: fullContent,
                word_count: newWordCount,
                updated_at: new Date().toISOString(),
              })
              .eq("id", chapterId);

            console.log(`[PROOFREAD-CHAPTER] Completed chapter "${chapter.title}": ${newWordCount} words`);
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, wordCount: fullContent.split(/\s+/).filter(w => w.length > 0).length })}\n\n`));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });

  } catch (error) {
    console.error("Error in proofread-chapter:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
