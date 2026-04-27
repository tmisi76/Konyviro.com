import { useEffect, useState } from "react";
import { ChevronDown, Sparkles, Loader2, RefreshCw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChapterRecapCardProps {
  projectId: string;
}

interface RecapData {
  summary: string;
  lastParagraph: string;
  nextSteps: string[];
}

const STORAGE_PREFIX = "recap_dismissed_";

export function ChapterRecapCard({ projectId }: ChapterRecapCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Hide if user dismissed it for this session
  useEffect(() => {
    const key = `${STORAGE_PREFIX}${projectId}`;
    const wasDismissed = sessionStorage.getItem(key) === "1";
    setDismissed(wasDismissed);
  }, [projectId]);

  const fetchRecap = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chapter-recap", {
        body: { projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRecap(data as RecapData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nem sikerült betölteni az emlékeztetőt";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on open the first time
  useEffect(() => {
    if (!dismissed && !recap && !loading) {
      fetchRecap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, dismissed]);

  const handleDismiss = () => {
    sessionStorage.setItem(`${STORAGE_PREFIX}${projectId}`, "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="mx-auto max-w-[700px] px-16 pt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full items-center justify-between p-4 text-left transition hover:bg-primary/5"
              aria-label="Emlékeztető a folytatáshoz"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/15 p-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Folytasd onnan, ahol abbahagytad</h3>
                  <p className="text-xs text-muted-foreground">
                    Az AI összefoglalja az utolsó fejezetet és javasol következő lépéseket
                  </p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="space-y-4 border-t border-border/50 px-4 pb-4 pt-3">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Emlékeztető készítése...
                </div>
              ) : recap ? (
                <>
                  <div>
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Összefoglaló
                    </h4>
                    <p className="text-sm leading-relaxed">{recap.summary}</p>
                  </div>

                  {recap.lastParagraph && (
                    <div>
                      <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Itt hagytad abba
                      </h4>
                      <p className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
                        „{recap.lastParagraph.slice(0, 280)}
                        {recap.lastParagraph.length > 280 ? "…" : ""}"
                      </p>
                    </div>
                  )}

                  {recap.nextSteps.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Lightbulb className="h-3 w-3" />
                        Következő lépés ötletek
                      </h4>
                      <ul className="space-y-1.5">
                        {recap.nextSteps.map((step, idx) => (
                          <li key={idx} className="flex gap-2 text-sm">
                            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Még nincs emlékeztető. Kattints a frissítésre.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={handleDismiss}>
                  Bezárás
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchRecap}
                  disabled={loading}
                  className="gap-1.5"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                  Frissítés
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}