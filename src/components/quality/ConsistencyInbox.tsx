import { useEffect, useState } from "react";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Loader2, ShieldCheck, Trash2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QualityIssue {
  id: string;
  chapter_id: string;
  issue_type: string;
  severity: "low" | "medium" | "high" | string;
  description: string;
  suggestion: string | null;
  location_text: string | null;
  created_at: string;
  chapter_title?: string;
}

interface Props {
  projectId: string;
  onJumpToChapter?: (chapterId: string) => void;
}

const SEVERITY_META: Record<string, { color: string; icon: typeof AlertTriangle; label: string }> = {
  high: { color: "text-destructive", icon: AlertTriangle, label: "Súlyos" },
  medium: { color: "text-amber-500", icon: AlertCircle, label: "Közepes" },
  low: { color: "text-blue-500", icon: Info, label: "Enyhe" },
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  character_inconsistency: "Karakter-ellentmondás",
  plot_hole: "Cselekmény-bukfenc",
  timeline: "Időrend",
  pov: "Nézőpont",
  repetition: "Ismétlés",
  factual: "Ténybeli hiba",
  style: "Stílus",
};

export function ConsistencyInbox({ projectId, onJumpToChapter }: Props) {
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, title")
      .eq("project_id", projectId);

    if (!chapters || chapters.length === 0) {
      setIssues([]);
      setLoading(false);
      return;
    }

    const titleMap = new Map(chapters.map((c) => [c.id, c.title]));
    const { data, error } = await supabase
      .from("quality_issues")
      .select("*")
      .in("chapter_id", chapters.map((c) => c.id))
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Hiba a figyelmeztetések betöltésekor");
      setLoading(false);
      return;
    }

    setIssues(
      (data ?? []).map((i: QualityIssue) => ({ ...i, chapter_title: titleMap.get(i.chapter_id) }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const runConsistencyCheck = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("check-series-consistency", {
        body: { projectId },
      });
      if (error) throw error;
      toast.success("Konzisztencia ellenőrzés elindítva");
      setTimeout(load, 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hiba az ellenőrzés indításakor");
    } finally {
      setRunning(false);
    }
  };

  const dismissIssue = async (id: string) => {
    const { error } = await supabase.from("quality_issues").delete().eq("id", id);
    if (error) {
      toast.error("Nem sikerült eltávolítani");
      return;
    }
    setIssues((prev) => prev.filter((i) => i.id !== id));
  };

  const grouped = issues.reduce<Record<string, QualityIssue[]>>((acc, i) => {
    const sev = SEVERITY_META[i.severity] ? i.severity : "medium";
    (acc[sev] ||= []).push(i);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Konzisztencia figyelmeztetések
            {issues.length > 0 && <Badge variant="secondary">{issues.length}</Badge>}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Az AI által felismert logikai hibák, karakter-ellentmondások és sorozat-bukfencek.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={runConsistencyCheck} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Ellenőrzés futtatása
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
            <p className="text-sm">Nincs aktív figyelmeztetés. Minden konzisztens!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(["high", "medium", "low"] as const).map((sev) => {
              const list = grouped[sev];
              if (!list?.length) return null;
              const meta = SEVERITY_META[sev];
              const Icon = meta.icon;
              return (
                <div key={sev}>
                  <div className={cn("flex items-center gap-2 text-sm font-semibold mb-2", meta.color)}>
                    <Icon className="h-4 w-4" /> {meta.label} ({list.length})
                  </div>
                  <div className="space-y-2">
                    {list.map((i) => (
                      <div key={i.id} className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {ISSUE_TYPE_LABELS[i.issue_type] ?? i.issue_type}
                              </Badge>
                              {i.chapter_title && (
                                <button
                                  className="text-xs text-primary hover:underline inline-flex items-center"
                                  onClick={() => onJumpToChapter?.(i.chapter_id)}
                                >
                                  {i.chapter_title}
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm">{i.description}</p>
                            {i.suggestion && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                💡 {i.suggestion}
                              </p>
                            )}
                            {i.location_text && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                „{i.location_text}"
                              </p>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => dismissIssue(i.id)}
                            title="Elvetés"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}