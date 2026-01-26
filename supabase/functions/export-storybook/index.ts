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

interface ExportOptions {
  includeBleed: boolean;
  highResolution: boolean;
  separatePages: boolean;
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    const { projectId, format, options, storybookData } = await req.json();

    if (!projectId || !format || !storybookData) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabaseClient
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
      highResolution: options?.highResolution || true,
      separatePages: options?.separatePages || false,
    };

    // For now, we'll generate a simple HTML-based PDF
    // In production, you would use a proper PDF generation library
    const pages: StorybookPage[] = storybookData.pages || [];
    const title = storybookData.title || "Mesekönyv";

    // Generate HTML for PDF
    const pageWidth = exportOptions.includeBleed ? 216 : 210; // A4 with/without bleed
    const pageHeight = exportOptions.includeBleed ? 303 : 297;
    const bleedMargin = exportOptions.includeBleed ? 3 : 0;

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
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
      font-family: 'Georgia', serif;
    }
    .page {
      width: ${pageWidth}mm;
      height: ${pageHeight}mm;
      position: relative;
      page-break-after: always;
      overflow: hidden;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .illustration {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .text-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20mm ${10 + bleedMargin}mm;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
      color: white;
    }
    .text-content {
      font-size: 14pt;
      line-height: 1.6;
      text-align: center;
    }
    .page-number {
      position: absolute;
      bottom: ${5 + bleedMargin}mm;
      right: ${10 + bleedMargin}mm;
      font-size: 10pt;
      color: rgba(255,255,255,0.6);
    }
    .cover-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #fbbf24, #f97316);
      color: white;
      text-align: center;
    }
    .cover-title {
      font-size: 32pt;
      font-weight: bold;
      margin-bottom: 20mm;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .cover-subtitle {
      font-size: 14pt;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page cover-page">
    <h1 class="cover-title">${title}</h1>
    <p class="cover-subtitle">Személyre szabott mesekönyv</p>
  </div>
`;

    // Add content pages
    for (const page of pages) {
      htmlContent += `
  <div class="page">
    ${page.illustrationUrl 
      ? `<img src="${page.illustrationUrl}" alt="Illusztráció" class="illustration" />`
      : `<div class="illustration" style="background: linear-gradient(135deg, #fef3c7, #fed7aa);"></div>`
    }
    <div class="text-overlay">
      <p class="text-content">${page.text}</p>
    </div>
    <span class="page-number">${page.pageNumber}</span>
  </div>
`;
    }

    // Add end page
    htmlContent += `
  <div class="page cover-page">
    <h2 style="font-size: 24pt;">Vége</h2>
    <p class="cover-subtitle" style="margin-top: 10mm;">Készült az InkStory segítségével</p>
  </div>
</body>
</html>
`;

    // Store HTML temporarily and generate PDF URL
    const htmlFileName = `exports/${userId}/${projectId}-${Date.now()}.html`;
    
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(htmlContent);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("project-assets")
      .upload(htmlFileName, htmlBytes, {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload export: ${uploadError.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("project-assets")
      .getPublicUrl(htmlFileName);

    // In a production environment, you would:
    // 1. Use a headless browser (Puppeteer) to convert HTML to PDF
    // 2. Or use a PDF generation service
    // For now, we return the HTML URL which can be printed to PDF

    console.log("Export generated:", urlData.publicUrl);

    // Log export activity
    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      action: "export_storybook",
      entity_type: "project",
      entity_id: projectId,
      metadata: {
        format,
        options: exportOptions,
        pages_count: pages.length,
      },
    });

    return new Response(
      JSON.stringify({
        downloadUrl: urlData.publicUrl,
        format: "html", // Will be converted to PDF client-side or via print
        message: "Export ready. Open the URL and use browser print to save as PDF.",
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
