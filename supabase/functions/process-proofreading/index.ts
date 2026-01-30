import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { fetchWithRetry, RETRY_CONFIG } from "../_shared/retry-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROOFREADING_SYSTEM_PROMPT = `Feladat: Javítsd az alábbi szöveget publikálható, profi magyar minőségre.

Instrukciók a javításhoz:
1. Javítsd a nyelvtani és helyesírási hibákat.
2. Egészítsd ki a hiányos vagy félbehagyott mondatokat a kontextus alapján (ez kritikus!).
3. Cseréld a magyartalan (angolból tükörfordított) kifejezéseket természetes magyar fordulatokra.
4. Javítsd a logikai bukfenceket a szövegfolyamban.

KIMENETI SZABÁLYOK (Szigorúan tartsd be!):
- KIZÁRÓLAG a javított szöveget add válaszul.
- NE írj bevezetőt (pl. "Itt a javított szöveg...").
- NE írj magyarázatot vagy felsorolást a hibákról.
- A kimenet azonnal a szöveg első mondatával kezdődjön.`;

const DEFAULT_PROOFREADING_MODEL = "google/gemini-2.5-pro";

// Fetch proofreading model from system_settings
async function getProofreadingModel(supabaseUrl: string, serviceRoleKey: string): Promise<string> {
  try {
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await serviceClient
      .from("system_settings")
      .select("value")
      .eq("key", "ai_proofreading_model")
      .single();

    if (error || !data) {
      console.log("No proofreading model configured, using default:", DEFAULT_PROOFREADING_MODEL);
      return DEFAULT_PROOFREADING_MODEL;
    }

    // FIX: Handle both JSON string and plain string formats
    let modelValue = data.value;
    if (typeof modelValue === "string") {
      try {
        modelValue = JSON.parse(modelValue);
      } catch {
        // Already a plain string, use directly
      }
    }
    console.log("Using proofreading model from settings:", modelValue);
    return (modelValue as string) || DEFAULT_PROOFREADING_MODEL;
  } catch (err) {
    console.error("Error fetching proofreading model:", err);
    return DEFAULT_PROOFREADING_MODEL;
  }
}

async function proofreadChapter(content: string, chapterTitle: string, model: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  console.log(`Starting proofreading for chapter: "${chapterTitle}" (${content.length} chars) with model: ${model}`);

  const result = await fetchWithRetry({
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        messages: [
          {
            role: "system",
            content: PROOFREADING_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Lektoráld a következő fejezetet: "${chapterTitle}"\n\n${content}`,
          },
        ],
      }),
    },
    maxRetries: RETRY_CONFIG.MAX_RETRIES,
    timeoutMs: 60000, // Reduced timeout - Lovable Gateway is faster
    onRetry: (attempt, status, error) => {
      console.log(`Retry ${attempt} for chapter "${chapterTitle}", status: ${status}, error: ${error?.message}`);
    },
  });

  if (result.timedOut) {
    throw new Error(`API timeout after ${result.attempts} attempts`);
  }

  if (result.rateLimited) {
    throw new Error(`Rate limited after ${result.attempts} attempts`);
  }

  if (!result.response || !result.response.ok) {
    const errorText = result.response ? await result.response.text() : "No response";
    console.error("Lovable AI Gateway error:", errorText);
    throw new Error(`API error (status: ${result.response?.status}) after ${result.attempts} attempts`);
  }

  const data = await result.response.json();
  
  const proofreadText = data.choices?.[0]?.message?.content;
  if (!proofreadText) {
    throw new Error("Unexpected API response format - no content in response");
  }

  console.log(`Proofreading completed for "${chapterTitle}": ${proofreadText.length} chars`);
  return proofreadText;
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

    // Get the proofreading model from system settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const proofreadingModel = await getProofreadingModel(supabaseUrl, serviceRoleKey);

    console.log(`[PROOFREADING] Processing chapter ${startIndex + 1}/${chapters.length} for order ${orderId} with model: ${proofreadingModel}`);

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
      // Process the current chapter
      const proofreadContent = await proofreadChapter(chapter.content, chapter.title, proofreadingModel);

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
