import { useState } from "react";
import { Loader2, Zap, Sparkles, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlotTwist {
  title: string;
  type: string;
  description: string;
  reasoning: string;
}

interface PlotTwistSuggestionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentChapterId?: string;
  onUseTwist?: (twist: PlotTwist) => void;
}

export function PlotTwistSuggestions({
  open,
  onOpenChange,
  projectId,
  currentChapterId,
  onUseTwist,
}: PlotTwistSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [twists, setTwists] = useState<PlotTwist[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generate = async () => {
    setLoading(true);
    setTwists([]);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-plot-twists", {
        body: { projectId, currentChapterId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTwists((data?.twists as PlotTwist[]) || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nem sikerült javaslatot generálni";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (twist: PlotTwist, idx: number) => {
    const text = `${twist.title} (${twist.type})\n\n${twist.description}\n\nMiért működik: ${twist.reasoning}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      toast.error("Nem sikerült a vágólapra másolni");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            3 plot twist javaslat
          </DialogTitle>
          <DialogDescription>
            Az AI a meglévő cselekményed alapján 3 különböző, logikusan következő csavart javasol.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {twists.length === 0 && !loading && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="mb-4 text-sm text-muted-foreground">
                Kattints a generálás gombra és kapsz 3 váratlan, mégis logikus fordulatot.
              </p>
              <Button onClick={generate} className="gap-2">
                <Zap className="h-4 w-4" />
                3 plot twist generálása
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Az AI elemzi az eddigi cselekményt...
              </p>
            </div>
          )}

          {twists.length > 0 && (
            <>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-3 pr-3">
                  {twists.map((twist, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                              {idx + 1}
                            </span>
                            <h4 className="font-semibold">{twist.title}</h4>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {twist.type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => copy(twist, idx)}
                          aria-label="Másolás"
                        >
                          {copiedIdx === idx ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>

                      <p className="mb-2 text-sm leading-relaxed">{twist.description}</p>
                      <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Miért működik: </span>
                        {twist.reasoning}
                      </div>

                      {onUseTwist && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onUseTwist(twist);
                              onOpenChange(false);
                            }}
                          >
                            Használom ezt
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <Button variant="outline" onClick={generate} disabled={loading}>
                  Új 3 javaslat
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}