import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StorybookPage {
  id: string;
  pageNumber: number;
  text: string;
  illustrationUrl?: string;
}

interface StorybookData {
  title: string;
  pages: StorybookPage[];
  coverUrl?: string;
  ageGroup?: string;
  illustrationStyle?: string;
}

interface ExportOptions {
  includeBleed: boolean;
  highResolution: boolean;
  separatePages: boolean;
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

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateStorybookHTML(storybookData: StorybookData, options: ExportOptions): string {
  const title = storybookData.title || "Mesekönyv";
  const pages = storybookData.pages || [];
  const coverUrl = storybookData.coverUrl;
  
  // Page dimensions (A4 with optional bleed)
  const pageWidth = options.includeBleed ? 216 : 210;
  const pageHeight = options.includeBleed ? 303 : 297;
  const bleedMargin = options.includeBleed ? 3 : 0;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');
    
    @page {
      size: ${pageWidth}mm ${pageHeight}mm;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Nunito', 'Comic Sans MS', cursive, sans-serif;
      background: white;
    }
    
    .page {
      width: ${pageWidth}mm;
      height: ${pageHeight}mm;
      position: relative;
      page-break-after: always;
      overflow: hidden;
      background: white;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    /* Cover page */
    .cover-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #fbbf24, #f97316);
      color: white;
      text-align: center;
    }
    
    .cover-page.with-image {
      background: none;
    }
    
    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      position: absolute;
      top: 0;
      left: 0;
    }
    
    .cover-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 40mm ${15 + bleedMargin}mm;
      background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
      text-align: center;
    }
    
    .cover-title {
      font-size: 36pt;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      margin: 0;
    }
    
    .cover-subtitle {
      font-size: 14pt;
      opacity: 0.9;
      margin-top: 10mm;
    }
    
    /* Title page (white) */
    .title-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: white;
      color: #1a1a1a;
      text-align: center;
      padding: 20mm;
    }
    
    .title-page h1 {
      font-size: 32pt;
      font-weight: bold;
      color: #f97316;
      margin-bottom: 20mm;
    }
    
    .title-page .author {
      font-size: 14pt;
      color: #666;
      margin-top: 10mm;
    }
    
    .title-page .created-with {
      font-size: 10pt;
      color: #999;
      margin-top: 40mm;
    }
    
    /* Content pages */
    .content-page {
      position: relative;
    }
    
    .illustration {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .no-illustration {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #fef3c7, #fed7aa);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .text-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 15mm ${10 + bleedMargin}mm ${10 + bleedMargin}mm;
      background: rgba(0,0,0,0.7);
      border-radius: 8mm 8mm 0 0;
    }
    
    .text-content {
      font-size: 14pt;
      line-height: 1.6;
      text-align: center;
      color: white;
    }
    
    .page-number {
      position: absolute;
      bottom: ${5 + bleedMargin}mm;
      right: ${10 + bleedMargin}mm;
      font-size: 10pt;
      color: rgba(255,255,255,0.6);
    }
    
    /* End page */
    .end-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #fbbf24, #f97316);
      color: white;
      text-align: center;
    }
    
    .end-page h2 {
      font-size: 36pt;
      margin-bottom: 20mm;
    }
    
    .end-page .branding {
      font-size: 12pt;
      opacity: 0.8;
    }
  `;

  let html = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>`;

  // 1. Cover page
  if (coverUrl) {
    html += `
  <div class="page cover-page with-image">
    <img src="${coverUrl}" alt="Borító" class="cover-image" />
    <div class="cover-overlay">
      <h1 class="cover-title">${escapeHtml(title)}</h1>
    </div>
  </div>`;
  } else {
    html += `
  <div class="page cover-page">
    <h1 class="cover-title">${escapeHtml(title)}</h1>
    <p class="cover-subtitle">Személyre szabott mesekönyv</p>
  </div>`;
  }

  // 2. Title page (white with title)
  html += `
  <div class="page title-page">
    <h1>${escapeHtml(title)}</h1>
    <p class="created-with">Készült a KönyvÍró segítségével</p>
  </div>`;

  // 3. Content pages
  for (const page of pages) {
    html += `
  <div class="page content-page">
    ${page.illustrationUrl 
      ? `<img src="${page.illustrationUrl}" alt="Illusztráció" class="illustration" />`
      : `<div class="no-illustration"></div>`
    }
    <div class="text-overlay">
      <p class="text-content">${escapeHtml(page.text)}</p>
    </div>
    <span class="page-number">${page.pageNumber}</span>
  </div>`;
  }

  // 4. End page
  html += `
  <div class="page end-page">
    <h2>Vége</h2>
    <p class="branding">Készült a KönyvÍró segítségével</p>
  </div>`;

  html += `
</body>
</html>`;

  return html;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cloudConvertApiKey = Deno.env.get("CLOUDCONVERT_API_KEY");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check CloudConvert API key
    if (!cloudConvertApiKey) {
      return new Response(
        JSON.stringify({ error: "CloudConvert not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    const { projectId, format, options, storybookData } = await req.json();

    if (!projectId || !storybookData) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: projectId and storybookData are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, user_id, title")
      .eq("id", projectId)
      .single();

    if (projectError || !project || project.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Project not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const exportOptions: ExportOptions = {
      includeBleed: options?.includeBleed || false,
      highResolution: options?.highResolution !== false, // default true
      separatePages: options?.separatePages || false,
    };

    // Generate HTML
    const htmlContent = generateStorybookHTML(storybookData, exportOptions);

    // Create export record
    const { data: exportRecord, error: exportError } = await supabaseAdmin
      .from("exports")
      .insert({
        project_id: projectId,
        user_id: userId,
        format: "pdf",
        settings: { ...exportOptions, type: "storybook" },
        status: "processing",
      })
      .select()
      .single();

    if (exportError) {
      console.error("Export record error:", exportError);
      throw new Error("Failed to create export record");
    }

    // CloudConvert job - HTML to PDF
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
            file: utf8ToBase64(htmlContent),
            filename: "storybook.html",
          },
          "convert": {
            operation: "convert",
            input: "import-html",
            input_format: "html",
            output_format: "pdf",
            page_size: "a4",
            margin_top: 0,
            margin_bottom: 0,
            margin_left: 0,
            margin_right: 0,
            print_background: true,
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

      // Update export record with error
      await supabaseAdmin
        .from("exports")
        .update({
          status: "failed",
          error_message: "Failed to start conversion",
        })
        .eq("id", exportRecord.id);

      throw new Error("Failed to create conversion job");
    }

    const jobData = await jobResponse.json();

    console.log(`Storybook export job created: ${jobData.data.id}`);

    // Log export activity (fire and forget)
    try {
      await supabaseAdmin.from("activity_logs").insert({
        user_id: userId,
        action: "export_storybook",
        entity_type: "project",
        entity_id: projectId,
        metadata: {
          format: "pdf",
          options: exportOptions,
          pages_count: storybookData.pages?.length || 0,
          job_id: jobData.data.id,
        },
      });
    } catch {
      // Ignore activity log errors
    }

    return new Response(
      JSON.stringify({
        jobId: jobData.data.id,
        exportId: exportRecord.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Export storybook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
