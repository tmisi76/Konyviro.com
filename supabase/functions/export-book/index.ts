import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Font imports for CSS
const FONT_IMPORTS: Record<string, string> = {
  "Merriweather": "https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap",
  "PT Serif": "https://fonts.googleapis.com/css2?family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap",
  "Literata": "https://fonts.googleapis.com/css2?family=Literata:ital,wght@0,400;0,700;1,400&display=swap",
  "Open Sans": "https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400&display=swap",
};

// Font size mapping
const FONT_SIZES: Record<string, string> = {
  "11pt": "0.9em",
  "12pt": "1em",
  "14pt": "1.15em",
};

// Line spacing mapping
const LINE_SPACINGS: Record<string, string> = {
  "1.2": "1.4",
  "1.5": "1.6",
  "1.8": "1.9",
};

function generateBookCSS(settings: any): string {
  const fontFamily = settings.fontFamily || "Merriweather";
  const fontSize = FONT_SIZES[settings.fontSize] || "1em";
  const lineHeight = LINE_SPACINGS[settings.lineSpacing] || "1.6";
  const fontImport = FONT_IMPORTS[fontFamily];

  return `
    @import url('${fontImport}');
    
    body {
      font-family: '${fontFamily}', Georgia, serif;
      font-size: ${fontSize};
      line-height: ${lineHeight};
      text-align: justify;
      margin: 1em;
      color: #1a1a1a;
    }
    
    h1 {
      font-size: 1.8em;
      text-align: center;
      margin-top: 2em;
      margin-bottom: 1em;
      page-break-before: always;
    }
    
    h2 {
      font-size: 1.4em;
      margin-top: 1.5em;
    }
    
    p {
      text-indent: 1.5em;
      margin: 0.5em 0;
    }
    
    p:first-of-type {
      text-indent: 0;
    }
    
    .chapter-title {
      font-size: 2em;
      text-align: center;
      margin: 3em 0 2em 0;
    }
    
    blockquote {
      font-style: italic;
      margin: 1em 2em;
      border-left: 3px solid #ccc;
      padding-left: 1em;
    }
    
    .title-page {
      text-align: center;
      padding-top: 30%;
    }
    
    .title-page h1 {
      font-size: 2.5em;
      margin-bottom: 0.5em;
      page-break-before: avoid;
    }
    
    .title-page .subtitle {
      font-size: 1.3em;
      color: #666;
      margin-bottom: 2em;
    }
    
    .title-page .author {
      font-size: 1.5em;
      margin-top: 2em;
    }
    
    .title-page .publisher {
      margin-top: 4em;
      font-size: 0.9em;
      color: #888;
    }
  `;
}

function generateTitlePageHTML(metadata: any): string {
  return `
    <div class="title-page">
      <h1>${escapeHtml(metadata.title)}</h1>
      ${metadata.subtitle ? `<p class="subtitle">${escapeHtml(metadata.subtitle)}</p>` : ""}
      <p class="author">${escapeHtml(metadata.author || "")}</p>
      <div class="publisher">
        <p>${escapeHtml(metadata.publisher || "KönyvÍró AI")}</p>
        <p>${new Date().getFullYear()}</p>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function blocksToHtml(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  
  return blocks
    .map((block) => {
      const content = block.content || "";
      switch (block.type) {
        case "heading":
          return `<h2>${escapeHtml(content)}</h2>`;
        case "quote":
          return `<blockquote>${escapeHtml(content)}</blockquote>`;
        case "paragraph":
        default:
          return `<p>${escapeHtml(content)}</p>`;
      }
    })
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { projectId, format, settings, metadata, useCover, coverUrl } = await req.json();

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title, user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project || project.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all chapters with blocks
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("id, title, sort_order")
      .eq("project_id", projectId)
      .order("sort_order");

    if (chaptersError) {
      throw new Error("Failed to fetch chapters");
    }

    // Fetch blocks for each chapter
    const chaptersWithContent = await Promise.all(
      (chapters || []).map(async (chapter, index) => {
        const { data: blocks } = await supabase
          .from("blocks")
          .select("type, content, sort_order")
          .eq("chapter_id", chapter.id)
          .order("sort_order");

        const chapterNumber = settings.includeChapterNumbers ? `${index + 1}. fejezet: ` : "";
        return {
          ...chapter,
          title: `${chapterNumber}${chapter.title}`,
          content: blocksToHtml(blocks || []),
        };
      })
    );

    // Generate ePub content
    const bookCSS = generateBookCSS(settings);
    const epubChapters = [];

    // Title page
    if (settings.includeTitlePage) {
      epubChapters.push({
        title: "Címoldal",
        data: generateTitlePageHTML(metadata),
      });
    }

    // Add chapters
    for (const chapter of chaptersWithContent) {
      epubChapters.push({
        title: chapter.title,
        data: `<h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>\n${chapter.content}`,
      });
    }

    // For ePub format, generate and return directly
    if (format === "epub") {
      // Use a simple ePub generator approach
      const epubContent = await generateSimpleEpub({
        title: metadata.title,
        author: metadata.author || "",
        publisher: metadata.publisher || "KönyvÍró AI",
        description: metadata.description || "",
        css: bookCSS,
        chapters: epubChapters,
        coverUrl: useCover ? coverUrl : undefined,
      });

      // Create export record
      await supabase.from("exports").insert({
        project_id: projectId,
        user_id: userId,
        format: "epub",
        settings: { ...settings, ...metadata },
        status: "completed",
        file_size: epubContent.byteLength,
        completed_at: new Date().toISOString(),
      });

      return new Response(epubContent, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/epub+zip",
          "Content-Disposition": `attachment; filename="${metadata.title}.epub"`,
        },
      });
    }

    // For other formats, use CloudConvert
    const cloudConvertApiKey = Deno.env.get("CLOUDCONVERT_API_KEY");
    if (!cloudConvertApiKey) {
      return new Response(JSON.stringify({ error: "CloudConvert not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // First generate ePub
    const epubContent = await generateSimpleEpub({
      title: metadata.title,
      author: metadata.author || "",
      publisher: metadata.publisher || "KönyvÍró AI",
      description: metadata.description || "",
      css: bookCSS,
      chapters: epubChapters,
      coverUrl: useCover ? coverUrl : undefined,
    });

    // Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from("exports")
      .insert({
        project_id: projectId,
        user_id: userId,
        format,
        settings: { ...settings, ...metadata },
        status: "processing",
      })
      .select()
      .single();

    if (exportError) {
      throw new Error("Failed to create export record");
    }

    // Create CloudConvert job
    const jobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cloudConvertApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-epub": {
            operation: "import/base64",
            file: btoa(String.fromCharCode(...new Uint8Array(epubContent))),
            filename: "book.epub",
          },
          "convert": {
            operation: "convert",
            input: "import-epub",
            input_format: "epub",
            output_format: format,
            ...(format === "pdf" && {
              page_size: settings.pageSize?.toLowerCase() || "a5",
              margin_top: settings.marginStyle === "wide" ? 25 : settings.marginStyle === "narrow" ? 10 : 20,
              margin_bottom: settings.marginStyle === "wide" ? 25 : settings.marginStyle === "narrow" ? 10 : 20,
              margin_left: settings.marginStyle === "wide" ? 20 : settings.marginStyle === "narrow" ? 10 : 15,
              margin_right: settings.marginStyle === "wide" ? 20 : settings.marginStyle === "narrow" ? 10 : 15,
            }),
          },
          "export": {
            operation: "export/url",
            input: "convert",
          },
        },
      }),
    });

    if (!jobResponse.ok) {
      const errorText = await jobResponse.text();
      console.error("CloudConvert error:", errorText);
      throw new Error("Failed to create conversion job");
    }

    const jobData = await jobResponse.json();

    return new Response(
      JSON.stringify({
        jobId: jobData.data.id,
        exportId: exportRecord.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Export error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Simple ePub generator
async function generateSimpleEpub(options: {
  title: string;
  author: string;
  publisher: string;
  description: string;
  css: string;
  chapters: { title: string; data: string }[];
  coverUrl?: string;
}): Promise<ArrayBuffer> {
  const { title, author, publisher, description, css, chapters, coverUrl } = options;

  // We'll use JSZip-like approach with basic zip structure
  // For now, return a simple HTML wrapped as pseudo-ePub
  // In production, use a proper ePub library
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>
  ${chapters.map(ch => ch.data).join("\n<hr/>\n")}
</body>
</html>
  `;

  // Convert to ArrayBuffer
  const encoder = new TextEncoder();
  return encoder.encode(htmlContent).buffer;
}
