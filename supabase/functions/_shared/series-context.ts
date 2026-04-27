/**
 * Shared utilities for fetching and building series-level context
 * (canonical characters, world bible, timeline events, prior volumes' summaries).
 *
 * Used by write-scene, write-section, generate-story and other generators
 * so that books that belong to a series stay consistent across volumes.
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SeriesContextData {
  series: {
    id: string;
    title: string;
    description: string | null;
    bible: Record<string, unknown>;
  };
  currentVolume: number;
  previousVolumes: Array<{
    id: string;
    title: string;
    volume_number: number;
    description: string | null;
    summary: string;
  }>;
  characters: Array<{
    id: string;
    name: string;
    aliases: string[];
    canonical_data: Record<string, unknown>;
    latest_arc?: { volume_number: number; arc_summary: string | null; state_changes: Record<string, unknown> } | null;
  }>;
  events: Array<{
    volume_number: number | null;
    event_title: string;
    event_description: string | null;
    importance: string;
    involved_characters: string[];
  }>;
}

export function makeServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Load complete series context for a given project.
 * Returns null if the project does not belong to a series.
 */
export async function loadSeriesContext(
  client: SupabaseClient,
  projectId: string,
): Promise<SeriesContextData | null> {
  const { data: project, error: projErr } = await client
    .from("projects")
    .select("id, series_id, series_volume_number")
    .eq("id", projectId)
    .maybeSingle();

  if (projErr || !project?.series_id) return null;

  const seriesId = project.series_id as string;
  const currentVolume = (project.series_volume_number as number) || 1;

  const [{ data: series }, { data: previousProjects }, { data: characters }, { data: events }] =
    await Promise.all([
      client.from("series").select("id, title, description, bible").eq("id", seriesId).maybeSingle(),
      client
        .from("projects")
        .select("id, title, description, series_volume_number")
        .eq("series_id", seriesId)
        .lt("series_volume_number", currentVolume)
        .order("series_volume_number", { ascending: true }),
      client.from("series_characters").select("*").eq("series_id", seriesId),
      client.from("series_events").select("*").eq("series_id", seriesId).order("volume_number", { ascending: true }).order("sort_order", { ascending: true }),
    ]);

  if (!series) return null;

  // For each previous volume, build a short summary from its chapter summaries.
  const prevSummaries: SeriesContextData["previousVolumes"] = [];
  if (previousProjects && previousProjects.length > 0) {
    for (const prev of previousProjects) {
      const { data: chapters } = await client
        .from("chapters")
        .select("title, summary")
        .eq("project_id", prev.id)
        .order("sort_order", { ascending: true });
      const summary = (chapters || [])
        .filter((c) => c.summary && String(c.summary).trim().length > 0)
        .map((c) => `• ${c.title}: ${c.summary}`)
        .join("\n")
        .slice(0, 4000);
      prevSummaries.push({
        id: prev.id as string,
        title: prev.title as string,
        volume_number: (prev.series_volume_number as number) || 0,
        description: (prev.description as string) || null,
        summary,
      });
    }
  }

  // Pull latest arc per character (highest volume <= currentVolume)
  let charsWithArcs: SeriesContextData["characters"] = [];
  if (characters && characters.length > 0) {
    const charIds = characters.map((c) => c.id);
    const { data: arcs } = await client
      .from("series_character_arcs")
      .select("series_character_id, volume_number, arc_summary, state_changes")
      .in("series_character_id", charIds)
      .lte("volume_number", currentVolume)
      .order("volume_number", { ascending: false });

    const latestByChar: Record<string, NonNullable<SeriesContextData["characters"][number]["latest_arc"]>> = {};
    (arcs || []).forEach((a) => {
      const cid = a.series_character_id as string;
      if (!latestByChar[cid]) {
        latestByChar[cid] = {
          volume_number: a.volume_number as number,
          arc_summary: (a.arc_summary as string) || null,
          state_changes: (a.state_changes as Record<string, unknown>) || {},
        };
      }
    });

    charsWithArcs = characters.map((c) => ({
      id: c.id as string,
      name: c.name as string,
      aliases: ((c.aliases as string[]) || []),
      canonical_data: (c.canonical_data as Record<string, unknown>) || {},
      latest_arc: latestByChar[c.id as string] || null,
    }));
  }

  return {
    series: {
      id: series.id as string,
      title: series.title as string,
      description: (series.description as string) || null,
      bible: (series.bible as Record<string, unknown>) || {},
    },
    currentVolume,
    previousVolumes: prevSummaries,
    characters: charsWithArcs,
    events: (events || []).map((e) => ({
      volume_number: (e.volume_number as number) ?? null,
      event_title: e.event_title as string,
      event_description: (e.event_description as string) || null,
      importance: (e.importance as string) || "medium",
      involved_characters: (e.involved_characters as string[]) || [],
    })),
  };
}

/**
 * Build the system-prompt block injected into AI writing calls when a project belongs to a series.
 */
export function buildSeriesContextPrompt(ctx: SeriesContextData | null): string {
  if (!ctx) return "";

  const lines: string[] = [];
  lines.push("\n\n--- KÖNYVSOROZAT KONTEXTUS (KÖTELEZŐ FIGYELEMBE VENNI!) ---");
  lines.push(`Sorozat: "${ctx.series.title}"`);
  if (ctx.series.description) lines.push(`Sorozat leírása: ${ctx.series.description}`);
  lines.push(`Aktuális kötet: ${ctx.currentVolume}.`);

  // World bible
  const bible = ctx.series.bible || {};
  if (bible && Object.keys(bible).length > 0) {
    if (typeof bible.world === "string" && bible.world.trim()) {
      lines.push(`\nVILÁG / SZABÁLYOK:\n${bible.world}`);
    }
    if (Array.isArray(bible.locations) && bible.locations.length > 0) {
      lines.push(`\nFONTOS HELYSZÍNEK:`);
      (bible.locations as Array<Record<string, string>>).slice(0, 20).forEach((l) => {
        lines.push(`• ${l.name}${l.description ? ` — ${l.description}` : ""}`);
      });
    }
    if (Array.isArray(bible.themes) && bible.themes.length > 0) {
      lines.push(`\nKULCSTÉMÁK: ${(bible.themes as string[]).join(", ")}`);
    }
    if (typeof bible.tone === "string" && bible.tone.trim()) {
      lines.push(`\nSOROZAT HANGNEME: ${bible.tone}`);
    }
  }

  // Previous volumes
  if (ctx.previousVolumes.length > 0) {
    lines.push(`\nKORÁBBI KÖTETEK ÖSSZEFOGLALÓI:`);
    ctx.previousVolumes.forEach((v) => {
      lines.push(`\n[${v.volume_number}. kötet — "${v.title}"]`);
      if (v.description) lines.push(v.description.slice(0, 400));
      if (v.summary) lines.push(v.summary);
    });
  }

  // Canonical characters
  if (ctx.characters.length > 0) {
    lines.push(`\n--- KANONIKUS KARAKTEREK (NEVÜK ÉS LEÍRÁSUK VÁLTOZTATHATATLAN!) ---`);
    ctx.characters.forEach((c) => {
      const cd = c.canonical_data || {};
      const parts: string[] = [];
      if (cd.appearance) parts.push(`kinézet: ${cd.appearance}`);
      if (cd.occupation) parts.push(`foglalkozás: ${cd.occupation}`);
      if (cd.personality) parts.push(`személyiség: ${cd.personality}`);
      if (cd.speech_style) parts.push(`beszédstílus: ${cd.speech_style}`);
      if (Array.isArray(cd.abilities) && cd.abilities.length) parts.push(`képességek: ${(cd.abilities as string[]).join(", ")}`);
      const aliasInfo = c.aliases.length ? ` (más néven: ${c.aliases.join(", ")})` : "";
      lines.push(`• ${c.name}${aliasInfo}${parts.length ? ` — ${parts.join(" | ")}` : ""}`);
      if (c.latest_arc?.arc_summary) {
        lines.push(`   ↳ ${c.latest_arc.volume_number}. kötet végi állapota: ${c.latest_arc.arc_summary}`);
      }
    });
  }

  // Timeline events
  if (ctx.events.length > 0) {
    lines.push(`\n--- IDŐVONAL (KORÁBBI ESEMÉNYEK) ---`);
    ctx.events
      .filter((e) => (e.volume_number ?? 0) < ctx.currentVolume)
      .slice(0, 30)
      .forEach((e) => {
        const vol = e.volume_number ? `[${e.volume_number}. kötet]` : "";
        const imp = e.importance === "critical" || e.importance === "high" ? " ⚠️" : "";
        lines.push(`${vol} ${e.event_title}${imp}${e.event_description ? `: ${e.event_description}` : ""}`);
      });
  }

  lines.push(`\nKÖTELEZŐ SZABÁLYOK:`);
  lines.push(`- A fenti karaktereket PONTOSAN ezeken a neveken használd, ezzel a kinézettel és személyiséggel.`);
  lines.push(`- TILOS olyan eseményt írni, ami ellentmond a korábbi kötetek történéseinek.`);
  lines.push(`- Ha egy karakter már meghalt vagy elveszett egy korábbi kötetben, NE jelenjen meg élve, hacsak a felhasználó kérésében ez kifejezetten szerepel.`);
  lines.push(`- Tartsd tiszteletben a sorozat világszabályait, hangnemét és kulcstémáit.`);
  lines.push(`--- KÖNYVSOROZAT KONTEXTUS VÉGE ---`);

  return lines.join("\n");
}
