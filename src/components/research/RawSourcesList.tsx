import { useState } from "react";
import { Loader2, Plus, Trash2, FileText, Link2, Type, Sparkles, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRawSources } from "@/hooks/useRawSources";
import { RawSourceUploader } from "./RawSourceUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OUTLINE_FROM_SOURCES_COST } from "@/constants/credits";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import type { RawSource, RawSourceKind, RawSourceStatus } from "@/types/rawSource";

interface RawSourcesListProps {
  projectId: string;
}

const KIND_ICON: Record<RawSourceKind, typeof FileText> = {
  text: Type,
  file: FileText,
  url: Link2,
};

const STATUS_LABEL: Record<RawSourceStatus, string> = {
  pending: "Feldolgozás…",
  extracted: "Kész",
  analyzed: "Elemzett",
  failed: "Hiba",
};

const STATUS_COLOR: Record<RawSourceStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  extracted: "bg-blue-500/10 text-blue-600",
  analyzed: "bg-emerald-500/10 text-emerald-600",
  failed: "bg-destructive/10 text-destructive",
};

export function RawSourcesList({ projectId }: RawSourcesListProps) {
  const { rawSources, isLoading, refetch, deleteRawSource } = useRawSources(projectId);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { canGenerateWords } = useSubscription();
  const hasCredits = canGenerateWords(OUTLINE_FROM_SOURCES_COST);

  const extractedCount = rawSources.filter((s) => s.status === "extracted" || s.status === "analyzed").length;

  const handleGenerateOutline = async () => {
    if (!hasCredits) {
      toast.error(`Nincs elég kredit (${OUTLINE_FROM_SOURCES_COST} szó szükséges)`);
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-raw-sources", {
        body: { projectId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const outline = data?.outline;
      if (!outline?.chapters?.length) {
        toast.error("Az AI nem tudott vázlatot generálni");
        return;
      }

      // Create chapters in DB from outline
      const chaptersToInsert = outline.chapters.map((c: any, i: number) => ({
        project_id: projectId,
        title: c.title || `Fejezet ${i + 1}`,
        summary: c.description || "",
        key_points: Array.isArray(c.key_points) ? c.key_points : [],
        sort_order: i,
        status: "draft",
        writing_status: "pending",
      }));

      const { error: insertErr } = await supabase
        .from("chapters")
        .insert(chaptersToInsert);
      if (insertErr) throw insertErr;

      toast.success(
        `Vázlat elkészült: ${outline.chapters.length} fejezet hozzáadva${
          outline.gaps?.length ? ` • ${outline.gaps.length} hiányzó téma jelölve` : ""
        }`
      );
      refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Hiba";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Forrásanyagok</h2>
          <p className="text-sm text-muted-foreground">
            Töltsd fel saját blogposztjaidat, jegyzeteidet vagy PDF-jeidet – az AI ezekből szakkönyv-vázlatot készít.
          </p>
        </div>
        <Button onClick={() => setUploaderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tartalom hozzáadása
        </Button>
      </div>

      {rawSources.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-1 font-medium">Még nincs forrásanyag</h3>
          <p className="mb-4 max-w-md text-sm text-muted-foreground">
            Dobálj be blogposztokat, jegyzeteket vagy linkeket – az AI ezekből összefüggő szakkönyvet fűz össze.
          </p>
          <Button onClick={() => setUploaderOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Első forrásanyag
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>
                {extractedCount} / {rawSources.length} feldolgozva •{" "}
                <strong>{OUTLINE_FROM_SOURCES_COST.toLocaleString()} szó</strong> a vázlatért
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleGenerateOutline}
              disabled={generating || extractedCount === 0 || !hasCredits}
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Szakkönyv-vázlat generálása
            </Button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto">
            {rawSources.map((s: RawSource) => {
              const Icon = KIND_ICON[s.source_kind];
              return (
                <div
                  key={s.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex flex-1 items-start gap-3 overflow-hidden">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate font-medium">{s.title || "Cím nélkül"}</h4>
                        <Badge className={cn("shrink-0 text-xs", STATUS_COLOR[s.status])} variant="secondary">
                          {STATUS_LABEL[s.status]}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {s.extracted_text?.slice(0, 220) || s.error_message || "—"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{s.word_count.toLocaleString()} szó</span>
                        {s.topic_cluster && (
                          <Badge variant="outline" className="text-xs">
                            {s.topic_cluster}
                          </Badge>
                        )}
                        {s.status === "failed" && s.error_message && (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-3 w-3" /> {s.error_message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRawSource(s.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <RawSourceUploader
        isOpen={uploaderOpen}
        onClose={() => setUploaderOpen(false)}
        projectId={projectId}
        onUploaded={refetch}
      />
    </div>
  );
}