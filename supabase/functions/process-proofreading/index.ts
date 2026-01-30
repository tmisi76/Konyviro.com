import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function proofreadChapter(content: string, chapterTitle: string): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  console.log(`Starting proofreading for chapter: "${chapterTitle}" (${content.length} chars) with model: claude-sonnet-4-20250514`);

  // Retry logic with exponential backoff
  const maxRetries = 5;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

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
          system: PROOFREADING_SYSTEM_PROMPT,
          messages: [
            { role: "user", content: `Lektoráld a következő fejezetet: "${chapterTitle}"\n\n${content}` },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limit and gateway errors
      if (response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504 || response.status === 529) {
        console.error(`Status ${response.status} (attempt ${attempt}/${maxRetries})`);
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(response.status === 429 ? "Rate limited" : `Gateway error ${response.status}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Anthropic API error:", response.status, errorText);
        throw new Error(`API error (status: ${response.status})`);
      }

      const data = await response.json();
      const proofreadText = data.content?.[0]?.text;
      
      if (!proofreadText) {
        throw new Error("Unexpected API response format - no content in response");
      }

      console.log(`Proofreading completed for "${chapterTitle}": ${proofreadText.length} chars`);
      return proofreadText;

    } catch (fetchError) {
      lastError = fetchError as Error;
      if ((fetchError as Error).name === "AbortError") {
        console.error(`Timeout (attempt ${attempt}/${maxRetries})`);
      } else {
        console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
      }
      if (attempt < maxRetries) {
        const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    console.log(`[PROOFREADING] Processing order: ${orderId}`);

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from("proofreading_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // FIXED: Allow both "paid" and "processing" status for resume capability
    if (order.status !== "paid" && order.status !== "processing") {
      console.log(`[PROOFREADING] Order not in processable status, skipping: ${order.status}`);
      return new Response(
        JSON.stringify({ message: "Order already completed or failed", status: order.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Update status to processing only if it's "paid"
    if (order.status === "paid") {
      await supabaseAdmin
        .from("proofreading_orders")
        .update({ 
          status: "processing",
          started_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    // Get all chapters for the project
    const { data: chapters, error: chaptersError } = await supabaseAdmin
      .from("chapters")
      .select("id, title, content, sort_order")
      .eq("project_id", order.project_id)
      .order("sort_order", { ascending: true });

    if (chaptersError || !chapters) {
      throw new Error("Failed to fetch chapters");
    }

    // FIXED: Resume from current_chapter_index instead of starting from 0
    const startIndex = order.current_chapter_index || 0;
    
    // Update total_chapters if not set
    if (!order.total_chapters || order.total_chapters !== chapters.length) {
      await supabaseAdmin
        .from("proofreading_orders")
        .update({ total_chapters: chapters.length })
        .eq("id", orderId);
    }

    console.log(`[PROOFREADING] Processing chapter ${startIndex + 1}/${chapters.length} for order ${orderId} with model: claude-sonnet-4-20250514`);

    // Check if we're already done
    if (startIndex >= chapters.length) {
      console.log(`[PROOFREADING] All chapters already processed, marking as completed`);
      
      // Mark as completed
      await supabaseAdmin
        .from("proofreading_orders")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Proofreading already completed",
          processedCount: chapters.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const chapter = chapters[startIndex];

    // Skip empty chapters
    if (!chapter.content || chapter.content.trim().length === 0) {
      console.log(`[PROOFREADING] Skipping empty chapter: ${chapter.title}`);
      
      // Update progress and trigger next chapter
      const nextIndex = startIndex + 1;
      await supabaseAdmin
        .from("proofreading_orders")
        .update({ current_chapter_index: nextIndex })
        .eq("id", orderId);

      // Fire-and-forget call to process next chapter
      if (nextIndex < chapters.length) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        
        fetch(`${supabaseUrl}/functions/v1/process-proofreading`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ orderId }),
        }).catch((err) => console.error("[PROOFREADING] Failed to trigger next chapter:", err));
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true,
          chapterIndex: startIndex,
          message: `Skipped empty chapter: ${chapter.title}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    try {
      // Process the current chapter with Claude Sonnet 4.5
      const proofreadContent = await proofreadChapter(chapter.content, chapter.title);

      // Update the chapter with proofread content
      const wordCount = proofreadContent.split(/\s+/).filter(w => w.length > 0).length;
      
      const { error: updateError } = await supabaseAdmin
        .from("chapters")
        .update({ 
          content: proofreadContent,
          word_count: wordCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chapter.id);

      if (updateError) {
        console.error(`[PROOFREADING] Failed to update chapter ${chapter.id}:`, updateError);
        throw new Error(`Failed to update chapter: ${chapter.title}`);
      }

      // Update progress
      const nextIndex = startIndex + 1;
      const isLastChapter = nextIndex >= chapters.length;

      if (isLastChapter) {
        // Mark as completed
        await supabaseAdmin
          .from("proofreading_orders")
          .update({ 
            status: "completed",
            completed_at: new Date().toISOString(),
            current_chapter_index: nextIndex,
          })
          .eq("id", orderId);

        // Update project word count
        const { data: updatedChapters } = await supabaseAdmin
          .from("chapters")
          .select("word_count")
          .eq("project_id", order.project_id);

        if (updatedChapters) {
          const totalWords = updatedChapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
          await supabaseAdmin
            .from("projects")
            .update({ word_count: totalWords })
            .eq("id", order.project_id);
        }

        console.log(`[PROOFREADING] Completed all ${chapters.length} chapters for order ${orderId}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            completed: true,
            processedCount: chapters.length,
            message: "Proofreading completed successfully",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Update progress for non-last chapter
      await supabaseAdmin
        .from("proofreading_orders")
        .update({ current_chapter_index: nextIndex })
        .eq("id", orderId);

      console.log(`[PROOFREADING] Chapter ${startIndex + 1}/${chapters.length} completed, triggering next...`);

      // Fire-and-forget call to process next chapter
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      
      fetch(`${supabaseUrl}/functions/v1/process-proofreading`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ orderId }),
      }).catch((err) => console.error("[PROOFREADING] Failed to trigger next chapter:", err));

      return new Response(
        JSON.stringify({ 
          success: true, 
          chapterIndex: startIndex,
          nextChapterIndex: nextIndex,
          message: `Chapter ${startIndex + 1}/${chapters.length} processed`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );

    } catch (chapterError) {
      console.error(`[PROOFREADING] Error processing chapter ${chapter.title}:`, chapterError);
      
      // Mark as failed
      await supabaseAdmin
        .from("proofreading_orders")
        .update({ 
          status: "failed",
          error_message: `Hiba a "${chapter.title}" fejezet lektorálása közben: ${chapterError instanceof Error ? chapterError.message : "Unknown error"}`,
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed at chapter: ${chapter.title}`,
          chapterIndex: startIndex,
          details: chapterError instanceof Error ? chapterError.message : "Unknown error",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

  } catch (error) {
    console.error("[PROOFREADING] Error in process-proofreading:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
