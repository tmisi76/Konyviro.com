import { useState } from "react";
import { Play, Pause, Square, RefreshCw, FileText, Sparkles, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { BuyCreditModal } from "@/components/credits/BuyCreditModal";
import type { AutoWriteProgress, ChapterWithScenes, SceneOutline } from "@/types/autowrite";

interface AutoWritePanelProps {
  chapters: ChapterWithScenes[];
  progress: AutoWriteProgress;
  genre?: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onGenerateOutlines: () => void;
}

const STATUS_LABELS: Record<AutoWriteProgress["status"], string> = {
  idle: "Várakozás",
  generating_outline: "Vázlat generálás...",
  writing: "Írás folyamatban...",
  paused: "Szüneteltetve",
  completed: "Befejezve",
  error: "Hiba",
};

const SCENE_STATUS_COLORS: Record<SceneOutline["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  writing: "bg-primary text-primary-foreground animate-pulse",
  done: "bg-success text-success-foreground",
  failed: "bg-destructive text-destructive-foreground",
  skipped: "bg-warning text-warning-foreground",
};

// Section type labels for non-fiction
const SECTION_LABELS: Record<string, string> = {
  intro: "Bevezető",
  concept: "Fogalom",
  example: "Példa",
  exercise: "Gyakorlat",
  summary: "Összefoglaló",
  case_study: "Esettanulmány",
};

export function AutoWritePanel({
  chapters,
  progress,
  genre = "fiction",
  onStart,
  onPause,
  onResume,
  onReset,
  onGenerateOutlines,
}: AutoWritePanelProps) {
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [showBuyCreditModal, setShowBuyCreditModal] = useState(false);
  const { getRemainingWords, canGenerateWords, isLoading: subscriptionLoading } = useSubscription();
  
  // Determine if this is a non-fiction project
  const isNonFiction = genre === "szakkonyv";
  
  // Dynamic terminology
  const itemLabelPlural = isNonFiction ? "szekció" : "jelenet";

  // Credit check - estimate ~500 words per scene
  const estimatedWordsNeeded = 500;
  const hasCredits = canGenerateWords(estimatedWordsNeeded);
  const remainingWords = getRemainingWords();

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const allOutlinesComplete = chapters.every(c => c.scene_outline.length > 0);
  const progressPercent = progress.totalScenes > 0 
    ? Math.round((progress.completedScenes / progress.totalScenes) * 100) 
    : 0;

  const estimatedTimeMinutes = progress.totalScenes > 0
    ? Math.round((progress.totalScenes - progress.completedScenes) * 1.5)
    : 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              {isNonFiction ? "Automatikus Szakkönyvírás" : "Automatikus Könyvírás"}
            </h2>
          </div>
          <Badge variant={progress.status === "error" ? "destructive" : "secondary"}>
            {STATUS_LABELS[progress.status]}
          </Badge>
        </div>

        {/* Credit Warning */}
        {!hasCredits && progress.status === "idle" && !subscriptionLoading && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Nincs elég kredit!</p>
              <p className="text-muted-foreground text-xs">
                {remainingWords === 0 
                  ? "Elfogytak a szavaid erre a hónapra." 
                  : `Csak ${remainingWords.toLocaleString()} szó maradt.`}
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowBuyCreditModal(true)}
            >
              Kredit vásárlás
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {progress.status === "idle" && (
            <>
              {!allOutlinesComplete && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onGenerateOutlines}
                  className="flex-1"
                  disabled={!hasCredits}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isNonFiction ? "Szekció Vázlat" : "Jelenet Vázlat"}
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={onStart}
                className="flex-1"
                disabled={chapters.length === 0 || !hasCredits}
              >
                <Play className="h-4 w-4 mr-2" />
                Írás Indítása
              </Button>
            </>
          )}
          
          {(progress.status === "writing" || progress.status === "generating_outline") && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onPause}
              className="flex-1"
            >
              <Pause className="h-4 w-4 mr-2" />
              Szüneteltetés
            </Button>
          )}
          
          {progress.status === "paused" && (
            <>
              <Button 
                size="sm" 
                onClick={onResume}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Folytatás
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onReset}
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {progress.status === "completed" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onReset}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Újrakezdés
            </Button>
          )}
          
          {progress.status === "error" && (
            <>
              <Button 
                size="sm" 
                onClick={onResume}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Újrapróbálás
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onReset}
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Progress */}
        {progress.status !== "idle" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progressPercent}%</span>
              <span>{progress.completedScenes} / {progress.totalScenes} {itemLabelPlural}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.totalWords.toLocaleString()} szó</span>
              {estimatedTimeMinutes > 0 && (
                <span>~{estimatedTimeMinutes} perc hátra</span>
              )}
            </div>
          </div>
        )}

        {progress.error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {progress.error}
          </div>
        )}
      </div>

      {/* Chapter list with scenes */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {chapters.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Még nincsenek fejezetek</p>
              <p className="text-sm">Hozz létre fejezeteket a szerkesztőben</p>
            </div>
          ) : (
            chapters.map((chapter, chapterIndex) => (
              <Collapsible
                key={chapter.id}
                open={expandedChapters.includes(chapter.id)}
                onOpenChange={() => toggleChapter(chapter.id)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 p-3 rounded-lg text-left transition-colors",
                      "hover:bg-muted/50",
                      progress.currentChapterIndex === chapterIndex && 
                        progress.status === "writing" && "bg-primary/10 border border-primary/20"
                    )}
                  >
                    {expandedChapters.includes(chapter.id) ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{chapter.title}</span>
                        {chapter.generation_status === "completed" && (
                          <Badge variant="outline" className="bg-success/10 text-success text-xs">
                            ✓
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{chapter.scene_outline.length} {itemLabelPlural}</span>
                        <span>•</span>
                        <span>{chapter.word_count.toLocaleString()} szó</span>
                      </div>
                    </div>
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="ml-6 pl-4 border-l border-border space-y-1 py-2">
                    {chapter.scene_outline.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">
                        Nincs vázlat - generálás szükséges
                      </p>
                    ) : (
                      chapter.scene_outline.map((scene, sceneIndex) => (
                        <div
                          key={sceneIndex}
                          className={cn(
                            "flex items-start gap-2 p-2 rounded text-sm",
                            progress.currentChapterIndex === chapterIndex &&
                              progress.currentSceneIndex === sceneIndex &&
                              progress.status === "writing" && "bg-primary/5"
                          )}
                        >
                          <Badge 
                            className={cn(
                              "text-xs shrink-0 mt-0.5",
                              SCENE_STATUS_COLORS[scene.status]
                            )}
                          >
                            {scene.scene_number}
                          </Badge>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{scene.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {isNonFiction 
                                ? `${SECTION_LABELS[scene.pov] || scene.pov} • ${scene.target_words} szó`
                                : `${scene.pov} • ${scene.location}`
                              }
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer info */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        <p>
          {isNonFiction 
            ? "Az automatikus írás szekcióról szekcióra halad, minden fejezeten végigmenve."
            : "Az automatikus írás jelenetről jelenetre halad, minden fejezeten végigmenve."
          }
        </p>
        <p className="mt-1">A generált szöveget a szerkesztőben finomhangolhatod.</p>
      </div>

      <BuyCreditModal 
        open={showBuyCreditModal} 
        onOpenChange={setShowBuyCreditModal} 
      />
    </div>
  );
}
