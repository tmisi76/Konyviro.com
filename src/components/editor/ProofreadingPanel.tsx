import { Check, X, Loader2, SpellCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ProofSuggestion } from "@/hooks/useProofreading";

interface ProofreadingPanelProps {
  suggestions: ProofSuggestion[];
  isProofreading: boolean;
  onAccept: (id: string, replacement: string) => void;
  onReject: (id: string) => void;
  onProofread: () => void;
}

const typeLabels: Record<string, { label: string; color: string }> = {
  grammar: { label: "Nyelvtan", color: "text-destructive" },
  spelling: { label: "Helyesírás", color: "text-warning" },
  style: { label: "Stílus", color: "text-primary" },
  punctuation: { label: "Írásjelek", color: "text-muted-foreground" },
};

export function ProofreadingPanel({
  suggestions,
  isProofreading,
  onAccept,
  onReject,
  onProofread,
}: ProofreadingPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <SpellCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Lektorálás</span>
        </div>
        <Button
          size="sm"
          onClick={onProofread}
          disabled={isProofreading}
        >
          {isProofreading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <SpellCheck className="mr-1 h-3 w-3" />
          )}
          Ellenőrzés
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-2">
          {isProofreading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Lektorálás folyamatban...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Check className="h-6 w-6 text-success" />
              <span className="text-sm text-muted-foreground">
                Kattints az "Ellenőrzés" gombra
              </span>
            </div>
          ) : (
            suggestions.map((s) => {
              const typeInfo = typeLabels[s.type] || typeLabels.grammar;
              return (
                <div
                  key={s.id}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-3 w-3 ${typeInfo.color}`} />
                    <Badge variant="outline" className="text-xs">
                      {typeInfo.label}
                    </Badge>
                  </div>

                  <div className="text-sm">
                    <span className="line-through text-destructive/70">{s.original}</span>
                    {" → "}
                    <span className="font-medium text-success">{s.suggestion}</span>
                  </div>

                  {s.explanation && (
                    <p className="text-xs text-muted-foreground">{s.explanation}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => onAccept(s.id, s.suggestion)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Elfogadás
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => onReject(s.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
