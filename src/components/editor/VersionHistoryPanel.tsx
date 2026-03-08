import { useState } from "react";
import { History, RotateCcw, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useChapterVersions } from "@/hooks/useChapterVersions";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";

interface VersionHistoryPanelProps {
  chapterId: string | null;
  currentContent: string;
  currentWordCount: number;
  onRestore: () => void;
}

const triggerLabels: Record<string, string> = {
  manual: "Kézi mentés",
  auto: "Automatikus",
  ai_rewrite: "AI átírás előtt",
  auto_before_restore: "Visszaállítás előtt",
};

export function VersionHistoryPanel({
  chapterId,
  currentContent,
  currentWordCount,
  onRestore,
}: VersionHistoryPanelProps) {
  const { versions, isLoading, createSnapshot, restoreVersion, isRestoring } =
    useChapterVersions(chapterId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreateSnapshot = async () => {
    if (!chapterId || !currentContent) return;
    await createSnapshot({
      chapterId,
      content: currentContent,
      wordCount: currentWordCount,
      triggerType: "manual",
    });
  };

  const handleRestore = async (versionId: string) => {
    await restoreVersion(versionId);
    onRestore();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Verzióelőzmények</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateSnapshot}
          disabled={!chapterId}
        >
          <Plus className="mr-1 h-3 w-3" />
          Mentés
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nincs még verzió
            </p>
          ) : (
            versions.map((v) => (
              <div
                key={v.id}
                className="rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="secondary" className="text-xs">
                      {triggerLabels[v.trigger_type] || v.trigger_type}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(v.created_at), {
                        addSuffix: true,
                        locale: hu,
                      })}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {v.word_count} szó
                  </span>
                </div>

                {expandedId === v.id && (
                  <div className="mt-3 space-y-2">
                    <p className="line-clamp-4 text-xs text-muted-foreground whitespace-pre-wrap">
                      {v.content?.slice(0, 300)}
                      {(v.content?.length || 0) > 300 && "..."}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(v.id);
                      }}
                      disabled={isRestoring}
                    >
                      {isRestoring ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-3 w-3" />
                      )}
                      Visszaállítás
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
