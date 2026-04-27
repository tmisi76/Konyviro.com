import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function countWords(text: string): number {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => /[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(w)).length;
}

function stripHtml(html: string): string {
  // Remove scripts/styles
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  // Try to keep only main content
  const articleMatch = text.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) text = articleMatch[0];
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  return text.replace(/\s+/g, " ").trim();
}

async function extractFromUrl(url: string): Promise<{ title: string; text: string }> {
  const formatted = url.startsWith("http") ? url : `https://${url}`;
  const res = await fetch(formatted, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; KonyviroBot/1.0)" },
  });
  if (!res.ok) throw new Error(`URL fetch failed: ${res.status}`);
  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : formatted;
  const text = stripHtml(html);
  return { title, text };
}

async function extractFromFile(
  supabaseAdmin: ReturnType<typeof createClient>,
  storagePath: string,
  filename: string
): Promise<{ title: string; text: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from("project-assets")
    .download(storagePath);
  if (error || !data) throw new Error(`Download failed: ${error?.message}`);

  const lower = filename.toLowerCase();
  const buffer = await data.arrayBuffer();

  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    const text = new TextDecoder().decode(buffer);
    return { title: filename.replace(/\.(txt|md)$/i, ""), text };
  }

  if (lower.endsWith(".pdf")) {
    // pdf extraction via pdf.js (esm.sh)
    try {
      // @ts-ignore
      const pdfjs = await import("https://esm.sh/pdfjs-serverless@0.4.2");
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((it: any) => it.str);
        text += strings.join(" ") + "\n\n";
      }
      return { title: filename.replace(/\.pdf$/i, ""), text: text.trim() };
    } catch (e) {
      console.error("PDF parse failed:", e);
      throw new Error("Nem sikerült olvasni a PDF-et");
    }
  }

  if (lower.endsWith(".docx")) {
    try {
      // @ts-ignore
      const mammothMod = await import("https://esm.sh/mammoth@1.6.0?bundle");
      const result = await mammothMod.default.extractRawText({ arrayBuffer: buffer });
      return { title: filename.replace(/\.docx$/i, ""), text: result.value || "" };
    } catch (e) {
      console.error("DOCX parse failed:", e);
      throw new Error("Nem sikerült olvasni a DOCX-et");
    }
  }

  throw new Error(`Nem támogatott fájltípus: ${filename}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const {
      projectId,
      kind, // 'text' | 'file' | 'url'
      title,
      text,
      url,
      storagePath,
      originalFilename,
    } = body;

    if (!projectId || !kind) {
      return new Response(JSON.stringify({ error: "projectId és kind kötelező" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify project ownership
    const { data: project } = await supabaseUser
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .single();
    if (!project || project.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert pending record
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("raw_sources")
      .insert({
        project_id: projectId,
        user_id: userId,
        source_kind: kind,
        original_filename: originalFilename ?? null,
        storage_path: storagePath ?? null,
        source_url: url ?? null,
        title: title ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      return new Response(JSON.stringify({ error: insertErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract content
    try {
      let extractedTitle = title || "Új forrásanyag";
      let extractedText = "";

      if (kind === "text") {
        extractedText = (text || "").trim();
        if (!extractedText) throw new Error("A szöveg üres");
      } else if (kind === "url") {
        if (!url) throw new Error("URL kötelező");
        const r = await extractFromUrl(url);
        extractedTitle = title || r.title;
        extractedText = r.text;
      } else if (kind === "file") {
        if (!storagePath || !originalFilename) {
          throw new Error("storagePath és originalFilename kötelező");
        }
        const r = await extractFromFile(supabaseAdmin, storagePath, originalFilename);
        extractedTitle = title || r.title;
        extractedText = r.text;
      }

      // Limit to ~80k chars to keep DB row reasonable
      if (extractedText.length > 80000) {
        extractedText = extractedText.slice(0, 80000) + "\n\n[…levágva]";
      }

      const wordCount = countWords(extractedText);

      const { error: updateErr } = await supabaseAdmin
        .from("raw_sources")
        .update({
          title: extractedTitle,
          extracted_text: extractedText,
          word_count: wordCount,
          status: "extracted",
        })
        .eq("id", inserted.id);

      if (updateErr) throw new Error(updateErr.message);

      return new Response(
        JSON.stringify({
          id: inserted.id,
          title: extractedTitle,
          word_count: wordCount,
          status: "extracted",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (extractErr) {
      const msg = extractErr instanceof Error ? extractErr.message : String(extractErr);
      await supabaseAdmin
        .from("raw_sources")
        .update({ status: "failed", error_message: msg })
        .eq("id", inserted.id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("ingest-raw-source error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});