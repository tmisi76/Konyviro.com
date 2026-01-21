import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Fetching metadata for:", formattedUrl);

    // Fetch the page
    const response = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MetadataBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Nem sikerült letölteni: ${response.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await response.text();
    
    // Extract metadata using regex (simple approach)
    const getMetaContent = (name: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitle = getMetaContent("og:title");
    const title = ogTitle || (titleMatch ? titleMatch[1].trim() : null);

    // Extract author
    const author = getMetaContent("author") || 
                   getMetaContent("article:author") ||
                   getMetaContent("og:article:author");

    // Extract publisher/site name
    const publisher = getMetaContent("og:site_name") ||
                      getMetaContent("publisher");

    // Extract publication date and year
    const dateStr = getMetaContent("article:published_time") ||
                    getMetaContent("datePublished") ||
                    getMetaContent("date");
    let year: number | null = null;
    if (dateStr) {
      const yearMatch = dateStr.match(/(\d{4})/);
      if (yearMatch) year = parseInt(yearMatch[1]);
    }

    // Extract description
    const description = getMetaContent("og:description") ||
                        getMetaContent("description");

    const metadata = {
      title: title || new URL(formattedUrl).hostname,
      author,
      publisher,
      year,
      description,
      url: formattedUrl,
    };

    console.log("Extracted metadata:", metadata);

    return new Response(
      JSON.stringify({ success: true, metadata }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fetch metadata error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
