import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getModelForTask } from "../_shared/ai-settings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuditIssue {
  issue_type: string; // "name_consistency" | "location_consistency" | "guest_character"
  severity: "low" | "medium" | "high";
  description: string;
  suggestion?: string;
  location_text?: string;
  chapter_id: string;
}

/**
 * Extract candidate proper noun tokens (capitalized words) from a chapter.
 * We only flag tokens that are NOT in stopword set and look like names.
 */
function extractProperNouns(text: string): string[] {
  const stopwords = new Set([
    "A", "Az", "Egy", "Az", "De", "Ha", "Ezt", "Ez", "Az", "Ők", "Ő",
    "Mi", "Te", "Ti", "Én", "És", "Vagy", "Hogy", "Mert", "Mielőtt",
    "Miután", "Amíg", "Amikor", "Pedig", "Igen", "Nem",
    "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap",
    "Január", "Február", "Március", "Április", "Május", "Június",
    "Július", "Augusztus", "Szeptember", "Október", "November", "December",
  ]);
  const matches = text.match(/[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]{2,}(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]{2,})?/g) || [];
  const filtered = matches.filter(m => {
    const first = m.split(/\s+/)[0];
    return !stopwords.has(first);
  });
  return [...new Set(filtered)];
}

/**
 * Find name-like tokens that don't appear in the registered character list.
 * Uses fuzzy matching to allow declensions ("Annának", "Annától").
 */
function findGuestCharacters(properNouns: string[], registered: string[]): string[] {
  const registeredLower = registered.map(n => n.toLowerCase());
  const registeredFirstNames = registered.flatMap(n => n.split(/\s+/).map(p => p.toLowerCase()));

  return properNouns.filter(noun => {
    const lower = noun.toLowerCase();
    // Exact match
    if (registeredLower.some(r => lower === r || lower.startsWith(r) || r.startsWith(lower))) return false;
    // Match against any first/last name component (with declension tolerance)
    const parts = lower.split(/\s+/);
    const matchesAnyPart = parts.every(part =>
      registeredFirstNames.some(rfn => part.startsWith(rfn.slice(0, Math.max(4, rfn.length - 2))))
    );
    return !matchesAnyPart;
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_MODEL = await getModelForTask("quality");
    // ===== AUTH =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nincs jogosultság" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Érvénytelen token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // ===== INPUT =====
    const { projectId } = await req.json();
    if (!projectId || typeof projectId !== "string") {
      return new Response(JSON.stringify({ error: "projectId szükséges" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // ===== OWNERSHIP =====
    const { data: project } = await supabase
      .from("projects")
      .select("id, user_id, fiction_style")
      .eq("id", projectId)
      .single();
    if (!project || project.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Nincs jogosultságod ehhez a projekthez" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== LOAD DATA =====
    const [{ data: chapters }, { data: characters }] = await Promise.all([
      supabase.from("chapters")
        .select("id, title, content, sort_order")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true }),
      supabase.from("characters")
        .select("name")
        .eq("project_id", projectId),
    ]);

    if (!chapters || chapters.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        issues_found: 0,
        message: "Nincsenek fejezetek a vizsgálathoz.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const registeredNames = (characters || []).map(c => c.name);
    const issues: AuditIssue[] = [];

    // ===== HEURISTIC PASS: detect guest characters per chapter =====
    const allChapterContent = chapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      content: ch.content || "",
    }));

    // Track first-mention chapter for each suspect name
    const guestNameFirstSeen = new Map<string, { chapterId: string; chapterTitle: string }>();
    for (const ch of allChapterContent) {
      if (!ch.content || ch.content.trim().length === 0) continue;
      const properNouns = extractProperNouns(ch.content);
      const guests = findGuestCharacters(properNouns, registeredNames);
      for (const guest of guests) {
        if (!guestNameFirstSeen.has(guest)) {
          guestNameFirstSeen.set(guest, { chapterId: ch.id, chapterTitle: ch.title });
        }
      }
    }

    // Filter: a name is suspicious if it appears in 2+ chapters (likely a real character)
    // OR appears 3+ times in a single chapter
    const suspiciousGuests = new Map<string, { chapterId: string; count: number }>();
    for (const [name, firstSeen] of guestNameFirstSeen.entries()) {
      let totalCount = 0;
      let chapterCount = 0;
      for (const ch of allChapterContent) {
        const occurrences = (ch.content.match(new RegExp(`\\b${name.split(/\s+/)[0]}`, "g")) || []).length;
        if (occurrences > 0) chapterCount++;
        totalCount += occurrences;
      }
      if (chapterCount >= 2 || totalCount >= 3) {
        suspiciousGuests.set(name, { chapterId: firstSeen.chapterId, count: totalCount });
      }
    }

    // Limit to top 10 to avoid spam
    const topGuests = Array.from(suspiciousGuests.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    for (const [name, info] of topGuests) {
      issues.push({
        issue_type: "guest_character",
        severity: info.count >= 5 ? "medium" : "low",
        description: `"${name}" név ${info.count}-szer szerepel a könyvben, de nincs regisztrálva a karakterek között.`,
        suggestion: `Add hozzá "${name}"-t a karakterlistához, vagy ellenőrizd, hogy nem véletlen név-variáns-e (pl. egy meglévő karakter más néven).`,
        chapter_id: info.chapterId,
      });
    }

    // ===== AI PASS: deep consistency check via Lovable AI =====
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && allChapterContent.length > 0) {
      // Build a compact summary of the book (first 500 chars per chapter)
      const compactBook = allChapterContent
        .map((ch, i) => `[${i + 1}. ${ch.title}]\n${(ch.content || "").slice(0, 800)}`)
        .join("\n\n---\n\n")
        .slice(0, 30000); // cap total to ~30k chars to fit context

      const fictionStyle = (project.fiction_style as Record<string, unknown> | null) || {};
      const expectedNationality = fictionStyle.characterNationality || "ai_choose";
      const expectedSetting = fictionStyle.setting || "nincs megadva";

      const aiPrompt = `Te egy professzionális szerkesztő vagy. Az alábbi könyv-részletekben keress KONZISZTENCIA-HIBÁKAT:

ELVÁRT KULTURÁLIS HÁTTÉR: ${expectedNationality}
ELVÁRT HELYSZÍN/KORSZAK: ${expectedSetting}
REGISZTRÁLT KARAKTEREK: ${registeredNames.join(", ") || "nincs"}

Keresd:
1. NÉV-VARIÁNSOK: ugyanaz a karakter más-más néven szerepel (pl. "Anna" / "Annácska" / "Anikó" — vagy "Kovács Anna" / "Anna Kovács")
2. KULTURÁLIS INKONZISZTENCIA: a választott kultúrától eltérő nevek vagy helyszínek (pl. magyar kontextusban "John Smith" mellékszereplő)
3. HELYSZÍN-INKONZISZTENCIA: ugyanaz a helyszín különböző neveken (pl. "Váci utca" és "Vámház körút" felcserélve)
4. KARAKTER-ELLENTMONDÁS: ugyanaz a karakter ellentmondó tulajdonságokkal (pl. fejezet 1: "kék szem", fejezet 5: "barna szem")

KÖNYV TARTALOM:
${compactBook}

Válaszolj CSAK egy JSON tömbbel (max 8 issue):
[{"type": "name_variant" | "cultural" | "location" | "contradiction", "severity": "low" | "medium" | "high", "description": "rövid magyarázat", "suggestion": "javítási javaslat"}]`;

      try {
        const aiController = new AbortController();
        const aiTimeout = setTimeout(() => aiController.abort(), 60000);
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [
              { role: "system", content: "Te egy szigorú könyvszerkesztő vagy. Csak érvényes JSON-nal válaszolj." },
              { role: "user", content: aiPrompt },
            ],
            response_format: { type: "json_object" },
          }),
          signal: aiController.signal,
        });
        clearTimeout(aiTimeout);

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const rawContent = aiData?.choices?.[0]?.message?.content || "";
          // The AI may return either {issues: [...]} or [...] directly
          let parsed: unknown;
          try {
            parsed = JSON.parse(rawContent);
          } catch {
            // Try to extract JSON array from text
            const arrMatch = rawContent.match(/\[[\s\S]*\]/);
            if (arrMatch) parsed = JSON.parse(arrMatch[0]);
          }
          const aiIssues = Array.isArray(parsed)
            ? parsed
            : (parsed as { issues?: unknown[] })?.issues || [];
          const firstChapterId = allChapterContent[0].id;
          for (const ai of aiIssues as Array<Record<string, string>>) {
            if (!ai.description) continue;
            const typeMap: Record<string, string> = {
              name_variant: "name_consistency",
              cultural: "cultural_consistency",
              location: "location_consistency",
              contradiction: "character_contradiction",
            };
            issues.push({
              issue_type: typeMap[ai.type] || "name_consistency",
              severity: (ai.severity as "low" | "medium" | "high") || "medium",
              description: ai.description,
              suggestion: ai.suggestion || undefined,
              chapter_id: firstChapterId,
            });
          }
        } else {
          console.warn("AI consistency call failed:", aiResp.status);
        }
      } catch (aiErr) {
        console.error("AI consistency error:", aiErr);
      }
    }

    // ===== INSERT INTO quality_issues =====
    if (issues.length > 0) {
      // Clear previous audit results for this project's chapters (only this audit's issue_types)
      const chapterIds = chapters.map(c => c.id);
      await supabase
        .from("quality_issues")
        .delete()
        .in("chapter_id", chapterIds)
        .in("issue_type", [
          "guest_character",
          "name_consistency",
          "location_consistency",
          "cultural_consistency",
          "character_contradiction",
        ]);

      const { error: insertErr } = await supabase
        .from("quality_issues")
        .insert(issues);
      if (insertErr) {
        console.error("Failed to insert issues:", insertErr);
        return new Response(JSON.stringify({
          error: "Hiba az eredmények mentésekor",
          details: insertErr.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      issues_found: issues.length,
      chapters_scanned: chapters.length,
      message: issues.length === 0
        ? "Nem találtunk konzisztencia-problémát."
        : `${issues.length} potenciális problémát találtunk.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("audit-name-consistency error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});