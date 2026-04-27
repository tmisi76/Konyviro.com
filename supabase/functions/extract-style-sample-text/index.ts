import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_WORDS = 30000;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

function truncateToWordLimit(text: string, limit: number): { text: string; truncated: boolean } {
  const tokens = text.split(/(\s+)/);
  let words = 0;
  let i = 0;
  for (; i < tokens.length; i++) {
    if (tokens[i].trim().length > 0) {
      words++;
      if (words >= limit) {
        i++;
        break;
      }
    }
  }
  if (i >= tokens.length) return { text, truncated: false };
  return { text: tokens.slice(0, i).join("").trim(), truncated: true };
}

async function extractTxt(file: File): Promise<string> {
  return await file.text();
}

async function extractDocx(file: File): Promise<string> {
  // mammoth ESM Deno-kompatibilis változat
  const mammothMod = await import("https://esm.sh/mammoth@1.6.0?target=denonext");
  const mammoth = (mammothMod as { default?: unknown; extractRawText?: unknown }).default ?? mammothMod;
  const arrayBuffer = await file.arrayBuffer();
  // mammoth Deno-ban nem mindig fogadja el a Uint8Array-t, ezért ArrayBuffer-t adunk
  const result = await (mammoth as {
    extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  }).extractRawText({ arrayBuffer });
  return (result?.value ?? "").trim();
}

async function extractPdf(file: File): Promise<string> {
  // unpdf — Deno-kompatibilis, függőség-mentes PDF szövegkinyerő
  const unpdf = await import("https://esm.sh/unpdf@0.12.1?target=denonext");
  const buf = new Uint8Array(await file.arrayBuffer());
  const { extractText, getDocumentProxy } = unpdf as {
    extractText: (
      doc: unknown,
      opts?: { mergePages?: boolean },
    ) => Promise<{ totalPages: number; text: string | string[] }>;
    getDocumentProxy: (data: Uint8Array) => Promise<unknown>;
  };
  const doc = await getDocumentProxy(buf);
  const result = await extractText(doc, { mergePages: true });
  const text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
  return (text ?? "").trim();
}

function fileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

function defaultTitleFromFilename(name: string): string {
  const idx = name.lastIndexOf(".");
  const base = idx === -1 ? name : name.slice(0, idx);
  return base.replace(/[_-]+/g, " ").trim() || "Új minta";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Multipart parsing
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing 'file' field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > MAX_FILE_BYTES) {
      return new Response(
        JSON.stringify({ error: "A fájl túl nagy (max 20 MB)." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ext = fileExtension(file.name);
    let text = "";

    try {
      if (ext === "txt" || (file.type && file.type.startsWith("text/"))) {
        text = await extractTxt(file);
      } else if (ext === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        text = await extractDocx(file);
      } else if (ext === "pdf" || file.type === "application/pdf") {
        text = await extractPdf(file);
      } else {
        return new Response(
          JSON.stringify({
            error: "Nem támogatott fájlformátum. Csak PDF, DOCX vagy TXT engedélyezett.",
          }),
          { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (extractErr) {
      console.error("[extract-style-sample-text] extract error", extractErr);
      return new Response(
        JSON.stringify({
          error:
            "Nem sikerült kinyerni a szöveget a fájlból. Próbáld meg másik formátumban.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Tisztítás: BOM, null bytes, túl sok üres sor
    text = text
      .replace(/^\uFEFF/, "")
      .replace(/\u0000/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (text.length < 50) {
      return new Response(
        JSON.stringify({
          error:
            "A kinyert szöveg túl rövid. Kérlek, tölts fel hosszabb mintát.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { text: limited, truncated } = truncateToWordLimit(text, MAX_WORDS);
    const wordCount = countWords(limited);
    const title = defaultTitleFromFilename(file.name);

    return new Response(
      JSON.stringify({
        title,
        content: limited,
        wordCount,
        truncated,
        originalWordCount: countWords(text),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[extract-style-sample-text] error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
