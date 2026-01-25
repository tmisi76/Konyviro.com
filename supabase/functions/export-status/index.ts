import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const cloudConvertApiKey = Deno.env.get("CLOUDCONVERT_API_KEY")!;
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

    const { exportId, jobId } = await req.json();

    // Verify export ownership
    const { data: exportRecord, error: exportError } = await supabase
      .from("exports")
      .select("*")
      .eq("id", exportId)
      .eq("user_id", userId)
      .single();

    if (exportError || !exportRecord) {
      return new Response(JSON.stringify({ error: "Export not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check CloudConvert job status
    const jobResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${cloudConvertApiKey}`,
      },
    });

    if (!jobResponse.ok) {
      throw new Error("Failed to check job status");
    }

    const jobData = await jobResponse.json();
    const job = jobData.data;

    // Check job status
    if (job.status === "finished") {
      // Find the export task result
      const exportTask = job.tasks.find((t: any) => t.operation === "export/url");
      
      if (exportTask?.result?.files?.[0]) {
        const file = exportTask.result.files[0];
        
        // Update export record
        await supabase
          .from("exports")
          .update({
            status: "completed",
            file_url: file.url,
            file_size: file.size,
            completed_at: new Date().toISOString(),
          })
          .eq("id", exportId);

        return new Response(
          JSON.stringify({
            status: "completed",
            fileUrl: file.url,
            fileSize: file.size,
            fileName: file.filename,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (job.status === "error") {
      const errorMessage = job.tasks.find((t: any) => t.status === "error")?.message || "Conversion failed";
      
      await supabase
        .from("exports")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", exportId);

      return new Response(
        JSON.stringify({
          status: "failed",
          error: errorMessage,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Still processing
    return new Response(
      JSON.stringify({
        status: "processing",
        jobStatus: job.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Status check error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
