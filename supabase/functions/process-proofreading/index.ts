import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROOFREADING_SYSTEM_PROMPT = `Te egy professzionális magyar könyvlektor vagy, aki évtizedes tapasztalattal rendelkezik irodalmi művek szerkesztésében.

FELADATOD:
1. Helyesírási hibák javítása a magyar helyesírási szabályok szerint
2. Nyelvtani hibák kijavítása (egyeztetés, vonzatok, igeidők)
3. Stilisztikai javítások:
   - Felesleges ismétlődések eltávolítása
   - Klisék átfogalmazása
   - Szóhasználat finomítása
4. Mondatritmus és mondatszerkezet javítása
5. Bekezdések és dialógusok megfelelő tagolása

SZABÁLYOK:
- Őrizd meg a szerző egyedi hangját és stílusát
- NE változtasd meg a cselekményt, a karaktereket vagy a történet lényegét
- NE adj hozzá új tartalmakat vagy jeleneteket
- NE töröld ki a fontos részeket
- Tartsd meg a bekezdésstruktúrát
- A válaszod KIZÁRÓLAG a javított szöveg legyen, semmilyen magyarázat vagy megjegyzés nélkül`;

async function proofreadChapter(content: string, chapterTitle: string): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: PROOFREADING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Lektoráld a következő fejezetet: "${chapterTitle}"\n\n${content}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Anthropic API error:", errorText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.content || !data.content[0] || data.content[0].type !== "text") {
    throw new Error("Unexpected API response format");
  }

  return data.content[0].text;
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

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from("proofreading_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    if (order.status !== "paid") {
      console.log("Order not in paid status, skipping:", order.status);
      return new Response(
        JSON.stringify({ message: "Order not ready for processing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Update status to processing
    await supabaseAdmin
      .from("proofreading_orders")
      .update({ status: "processing" })
      .eq("id", orderId);

    // Get all chapters for the project
    const { data: chapters, error: chaptersError } = await supabaseAdmin
      .from("chapters")
      .select("id, title, content, sort_order")
      .eq("project_id", order.project_id)
      .order("sort_order", { ascending: true });

    if (chaptersError || !chapters) {
      throw new Error("Failed to fetch chapters");
    }

    console.log(`Processing ${chapters.length} chapters for order ${orderId}`);

    let processedCount = 0;
    let failedChapter: string | null = null;

    for (const chapter of chapters) {
      try {
        console.log(`Processing chapter ${processedCount + 1}/${chapters.length}: ${chapter.title}`);

        // Skip empty chapters
        if (!chapter.content || chapter.content.trim().length === 0) {
          console.log(`Skipping empty chapter: ${chapter.title}`);
          processedCount++;
          continue;
        }

        // Proofread the chapter
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
          console.error(`Failed to update chapter ${chapter.id}:`, updateError);
          throw new Error(`Failed to update chapter: ${chapter.title}`);
        }

        processedCount++;

        // Update progress
        await supabaseAdmin
          .from("proofreading_orders")
          .update({ current_chapter_index: processedCount })
          .eq("id", orderId);

        // Add a small delay between chapters to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (chapterError) {
        console.error(`Error processing chapter ${chapter.title}:`, chapterError);
        failedChapter = chapter.title;
        break;
      }
    }

    if (failedChapter) {
      // Mark as failed
      await supabaseAdmin
        .from("proofreading_orders")
        .update({ 
          status: "failed",
          error_message: `Hiba a "${failedChapter}" fejezet lektorálása közben`,
          current_chapter_index: processedCount,
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed at chapter: ${failedChapter}`,
          processedCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Mark as completed
    await supabaseAdmin
      .from("proofreading_orders")
      .update({ 
        status: "completed",
        completed_at: new Date().toISOString(),
        current_chapter_index: processedCount,
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

    console.log(`Proofreading completed for order ${orderId}. Processed ${processedCount} chapters.`);

    // Send completion email (optional - could trigger email function here)
    // TODO: Implement send-proofreading-complete-email

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount,
        message: "Proofreading completed successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in process-proofreading:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
