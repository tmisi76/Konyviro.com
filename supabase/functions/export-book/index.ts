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

// Margin settings in mm
function getMargins(marginStyle: string): { top: number; bottom: number; left: number; right: number } {
  switch (marginStyle) {
    case "wide":
      return { top: 25, bottom: 25, left: 20, right: 20 };
    case "narrow":
      return { top: 10, bottom: 10, left: 10, right: 10 };
    default: // normal
      return { top: 20, bottom: 20, left: 15, right: 15 };
  }
}

function generateBookCSS(settings: any): string {
  const fontFamily = settings.fontFamily || "Merriweather";
  const fontSize = FONT_SIZES[settings.fontSize] || "1em";
  const lineHeight = LINE_SPACINGS[settings.lineSpacing] || "1.6";
  const fontImport = FONT_IMPORTS[fontFamily];

  return `
    @import url('${fontImport}');
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: '${fontFamily}', Georgia, serif;
      font-size: ${fontSize};
      line-height: ${lineHeight};
      text-align: justify;
      margin: 0;
      padding: 1em;
      color: #1a1a1a;
      background: #fff;
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
      text-align: center;
    }
    
    p {
      text-indent: 1.5em;
      margin: 0.5em 0;
    }
    
    p:first-of-type {
      text-indent: 0;
    }
    
    .chapter {
      page-break-before: always;
    }
    
    .chapter:first-of-type {
      page-break-before: avoid;
    }
    
    .chapter-title {
      font-size: 2em;
      text-align: center;
      margin: 3em 0 2em 0;
      page-break-before: always;
      page-break-after: avoid;
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
      page-break-after: always;
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
    
    .toc {
      page-break-after: always;
      padding: 2em 0;
    }
    
    .toc h2 {
      font-size: 1.8em;
      margin-bottom: 1.5em;
    }
    
    .toc ul {
      list-style: none;
      padding: 0;
    }
    
    .toc li {
      margin: 0.8em 0;
      font-size: 1.1em;
    }
    
    .toc a {
      color: #1a1a1a;
      text-decoration: none;
    }
    
    .toc a:hover {
      text-decoration: underline;
    }
  `;
}

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function generateTableOfContents(chapters: { title: string }[]): string {
  return `
    <div class="toc">
      <h2>Tartalomjegyzék</h2>
      <ul>
        ${chapters.map((ch, i) => `
          <li>${i + 1}. ${escapeHtml(ch.title)}</li>
        `).join("")}
      </ul>
    </div>
  `;
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

function generateCompleteBookHtml(options: {
  metadata: any;
  settings: any;
  chapters: { title: string; content: string }[];
  css: string;
}): string {
  const { metadata, settings, chapters, css } = options;
  
  let html = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="author" content="${escapeHtml(metadata.author || "")}">
  <meta name="description" content="${escapeHtml(metadata.description || "")}">
  <title>${escapeHtml(metadata.title)}</title>
  <style>${css}</style>
</head>
<body>`;

  // Title page
  if (settings.includeTitlePage) {
    html += generateTitlePageHTML(metadata);
  }

  // Table of contents
  if (settings.includeTableOfContents) {
    html += generateTableOfContents(chapters);
  }

  // Chapters
  for (const chapter of chapters) {
    html += `
    <div class="chapter">
      <h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>
      ${chapter.content}
    </div>`;
  }

  html += `</body></html>`;
  
  return html;
}

// UTF-8 safe base64 encoding
function utf8ToBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
    const cloudConvertApiKey = Deno.env.get("CLOUDCONVERT_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check CloudConvert API key
    if (!cloudConvertApiKey) {
      return new Response(JSON.stringify({ error: "CloudConvert not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Validate format
    const validFormats = ["epub", "pdf", "mobi", "docx"];
    if (!validFormats.includes(format)) {
      return new Response(JSON.stringify({ error: `Invalid format: ${format}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Fetch all chapters with content field (for background-generated content)
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("id, title, sort_order, content")
      .eq("project_id", projectId)
      .order("sort_order");

    if (chaptersError) {
      throw new Error("Failed to fetch chapters");
    }

    // Fetch blocks for each chapter, fall back to chapters.content if no blocks
    const chaptersWithContent = await Promise.all(
      (chapters || []).map(async (chapter: { id: string; title: string; sort_order: number; content?: string }, index: number) => {
        const { data: blocks } = await supabase
          .from("blocks")
          .select("type, content, sort_order")
          .eq("chapter_id", chapter.id)
          .order("sort_order");

        // Check if blocks have actual content
        const blocksHaveContent = blocks && blocks.length > 0 && 
          blocks.some((b: { content?: string }) => b.content && b.content.trim());

        let chapterHtml: string;
        
        if (blocksHaveContent) {
          // Use blocks if they have content (user-edited content takes priority)
          chapterHtml = blocksToHtml(blocks || []);
        } else if (chapter.content && chapter.content.trim()) {
          // Fall back to chapters.content (auto-generated by background writer)
          // Convert plain text paragraphs to HTML
          chapterHtml = chapter.content
            .split(/\n\n+/)
            .filter((p: string) => p.trim())
            .map((p: string) => `<p>${escapeHtml(p.trim())}</p>`)
            .join("\n");
        } else {
          chapterHtml = "";
        }

        const chapterNumber = settings.includeChapterNumbers ? `${index + 1}. fejezet: ` : "";
        return {
          ...chapter,
          title: `${chapterNumber}${chapter.title}`,
          content: chapterHtml,
        };
      })
    );

    // Generate complete book HTML
    const bookCSS = generateBookCSS(settings);
    const fullBookHtml = generateCompleteBookHtml({
      metadata,
      settings,
      chapters: chaptersWithContent,
      css: bookCSS,
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

    // Build CloudConvert conversion options based on format
    const conversionOptions: Record<string, any> = {
      operation: "convert",
      input: "import-html",
      input_format: "html",
      output_format: format,
    };

    // Format-specific options
    if (format === "pdf") {
      const margins = getMargins(settings.marginStyle);
      conversionOptions.page_size = settings.pageSize?.toLowerCase() || "a5";
      conversionOptions.margin_top = margins.top;
      conversionOptions.margin_bottom = margins.bottom;
      conversionOptions.margin_left = margins.left;
      conversionOptions.margin_right = margins.right;
      conversionOptions.print_background = true;
    } else if (format === "epub") {
      conversionOptions.epub_title = metadata.title;
      conversionOptions.epub_author = metadata.author || "";
      conversionOptions.epub_publisher = metadata.publisher || "KönyvÍró AI";
    }

    // Create CloudConvert job - HTML to target format
    const jobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cloudConvertApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-html": {
            operation: "import/base64",
            file: utf8ToBase64(fullBookHtml),
            filename: "book.html",
          },
          "convert": conversionOptions,
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
      
      // Update export record with error
      await supabase
        .from("exports")
        .update({
          status: "failed",
          error_message: "Failed to start conversion",
        })
        .eq("id", exportRecord.id);

      throw new Error("Failed to create conversion job");
    }

    const jobData = await jobResponse.json();

    console.log(`Export job created: ${jobData.data.id} for format: ${format}`);

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
