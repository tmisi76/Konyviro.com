import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  BookOpen,
  FileEdit,
  Download,
  Sparkles,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoWrite } from "@/hooks/useAutoWrite";
import { useSubscription } from "@/hooks/useSubscription";
import { useWritingPersistence, PersistedWritingState } from "@/hooks/useWritingPersistence";
import { useCompletionCelebration } from "@/hooks/useCompletionCelebration";
import { BuyCreditModal } from "@/components/credits/BuyCreditModal";
import { WritingProgressModal } from "@/components/writing/WritingProgressModal";
import { ResumeWritingDialog } from "@/components/wizard/ResumeWritingDialog";
import type { Genre } from "@/types/wizard";
import type { ChapterWithScenes, SceneOutline } from "@/types/autowrite";

interface Step7AutoWriteProps {
  projectId: string;
  genre: Genre;
  estimatedMinutes?: number;
  onComplete: () => void;
}

type ChapterStatus = "waiting" | "writing" | "done";

interface ChapterDisplay {
  id: string;
  title: string;
  status: ChapterStatus;
  wordCount: number;
  scenesTotal: number;
  scenesCompleted: number;
}

export function Step7AutoWrite({ projectId, genre, estimatedMinutes, onComplete }: Step7AutoWriteProps) {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<ChapterDisplay[]>([]);
  const [currentContent, setCurrentContent] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [storyStructure, setStoryStructure] = useState<Record<string, unknown> | undefined>();
  const [showBuyCreditModal, setShowBuyCreditModal] = useState(false);
  const [creditCheckDone, setCreditCheckDone] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedState, setSavedState] = useState<PersistedWritingState | null>(null);
  const [resumeDecisionMade, setResumeDecisionMade] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressRef = useRef(0);

  const { getRemainingWords, canGenerateWords, isLoading: subscriptionLoading, subscription, usage } = useSubscription();
  const { saveProgress, clearProgress, loadProgress, hasSavedProgress } = useWritingPersistence(projectId);
  const { celebrate } = useCompletionCelebration();

  const {
    progress,
    startAutoWrite,
    pause,
    resume,
    restartFailedScenes,
  } = useAutoWrite({
    projectId,
    genre,
    storyStructure,
    onChapterUpdated: () => {
      fetchChapters();
    },
    onStreamingUpdate: (text) => {
      setStreamingText(text);
    },
  });

  // Watchdog timer: ha 3 percig nincs progress, auto-resume
  useEffect(() => {
    if (progress.status === "writing") {
      // Ellenőrizzük, hogy volt-e változás az utolsó ellenőrzés óta
      if (lastProgressRef.current === progress.completedScenes) {
        // Ha 3 perce nincs előrehaladás, próbáljunk újraindítani
        watchdogRef.current = setTimeout(() => {
          console.log("Watchdog: no progress for 3 minutes, attempting auto-resume...");
          resume();
        }, 180000); // 3 perc
      } else {
        // Volt előrehaladás, frissítsük a referenciát
        lastProgressRef.current = progress.completedScenes;
      }
      
      return () => {
        if (watchdogRef.current) {
          clearTimeout(watchdogRef.current);
        }
      };
    }
  }, [progress.status, progress.completedScenes, resume]);

  // Fetch project info
  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from("projects")
        .select("title, story_structure")
        .eq("id", projectId)
        .single();

      if (data) {
        setProjectTitle(data.title);
        if (data.story_structure) {
          setStoryStructure(data.story_structure as Record<string, unknown>);
        }
      }
    };

    fetchProject();
  }, [projectId]);

  // Fetch chapters
  const fetchChapters = useCallback(async () => {
    const { data } = await supabase
      .from("chapters")
      .select("id, title, word_count, scene_outline, generation_status")
      .eq("project_id", projectId)
      .order("sort_order");

    if (data) {
      const mapped: ChapterDisplay[] = data.map((ch, index) => {
        const scenes = (ch.scene_outline as unknown as SceneOutline[]) || [];
        const completedScenes = scenes.filter(s => s && s.status === "done").length;
        
        let status: ChapterStatus = "waiting";
        if (ch.generation_status === "completed") {
          status = "done";
        } else if (index === progress.currentChapterIndex && progress.status === "writing") {
          status = "writing";
        }

        return {
          id: ch.id,
          title: ch.title,
          status,
          wordCount: ch.word_count,
          scenesTotal: scenes.length,
          scenesCompleted: completedScenes,
        };
      });
      
      setChapters(mapped);
    }
  }, [projectId, progress.currentChapterIndex, progress.status]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  // Credit check - estimate ~500 words per scene
  const estimatedWordsNeeded = 500;
  const hasCredits = canGenerateWords(estimatedWordsNeeded);
  const remainingWords = getRemainingWords();

  // Check for saved progress on mount
  useEffect(() => {
    if (subscriptionLoading || resumeDecisionMade) return;
    
    const saved = loadProgress();
    if (saved && saved.status !== "completed" && saved.completedScenes > 0) {
      setSavedState(saved);
      setShowResumeDialog(true);
    } else {
      setResumeDecisionMade(true);
    }
  }, [subscriptionLoading, loadProgress, resumeDecisionMade]);

  // Handle resume decision
  const handleResume = () => {
    setShowResumeDialog(false);
    setResumeDecisionMade(true);
    // The auto-start will kick in after this
  };

  const handleRestart = () => {
    setShowResumeDialog(false);
    setResumeDecisionMade(true);
    clearProgress();
    // The auto-start will kick in after this
  };

  // Auto-start writing when component mounts (only if has credits and resume decision made)
  useEffect(() => {
    if (subscriptionLoading) return;
    setCreditCheckDone(true);
    
    if (!resumeDecisionMade) return;
    
    if (!hasStartedRef.current && projectId && storyStructure !== undefined && hasCredits) {
      hasStartedRef.current = true;
      // Small delay to let UI render first
      setTimeout(() => {
        startAutoWrite();
      }, 500);
    }
  }, [projectId, storyStructure, startAutoWrite, subscriptionLoading, hasCredits, resumeDecisionMade]);

  // Poll for content updates
  useEffect(() => {
    if (progress.status !== "writing") return;

    const currentChapter = chapters[progress.currentChapterIndex];
    if (!currentChapter) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("blocks")
        .select("content")
        .eq("chapter_id", currentChapter.id)
        .order("sort_order");

      if (data) {
        const content = data.map(b => b.content).join("\n\n");
        setCurrentContent(content);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [progress.status, progress.currentChapterIndex, chapters]);

  // Auto-scroll content
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [currentContent, streamingText]);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (progress.status === "writing" || progress.status === "paused" || progress.status === "generating_outline") {
      saveProgress({
        status: progress.status,
        currentChapterIndex: progress.currentChapterIndex,
        completedScenes: progress.completedScenes,
        totalScenes: progress.totalScenes,
        totalWords: progress.totalWords,
      });
    }
  }, [progress, saveProgress]);

  // Clear localStorage when completed
  useEffect(() => {
    if (progress.status === "completed") {
      clearProgress();
    }
  }, [progress.status, clearProgress]);

  // Celebrate on completion with sound + confetti
  useEffect(() => {
    if (progress.status === "completed") {
      celebrate();
    }
  }, [progress.status, celebrate]);

  const progressPercent = progress.totalScenes > 0 
    ? Math.round((progress.completedScenes / progress.totalScenes) * 100) 
    : 0;

  const isNonFiction = genre === "szakkonyv";
  const sceneLabel = isNonFiction ? "szekció" : "jelenet";

  const handleGoToEditor = () => {
    navigate(`/project/${projectId}`);
  };

  const handleGoToExport = () => {
    navigate(`/project/${projectId}/export`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header with progress */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {projectTitle || "Könyv Írása"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {progress.status === "completed" 
                ? "A könyv elkészült!" 
                : progress.status === "paused"
                ? "Szüneteltetve"
                : progress.status === "error"
                ? "Hiba történt"
                : `${progress.completedScenes}/${progress.totalScenes} ${sceneLabel} kész`
              }
              {progress.status === "writing" && progress.currentSceneTitle && (
                <span className="block text-xs text-primary/80 italic truncate mt-0.5">
                  Most íródik: "{progress.currentSceneTitle}"
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Word count */}
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums">
                {progress.totalWords.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">szó</div>
            </div>

            {/* Controls */}
            {progress.status === "writing" && (
              <Button variant="outline" onClick={pause}>
                <Pause className="w-4 h-4 mr-2" />
                Szünet
              </Button>
            )}
            {progress.status === "paused" && (
              <Button onClick={resume}>
                <Play className="w-4 h-4 mr-2" />
                Folytatás
              </Button>
            )}
            {progress.status === "completed" && (
              <>
                <Button variant="outline" onClick={handleGoToEditor}>
                  <FileEdit className="w-4 h-4 mr-2" />
                  Szerkesztés
                </Button>
                <Button onClick={handleGoToExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportálás
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{progressPercent}% kész</span>
          <div className="flex gap-2">
            <span>
              {progress.completedScenes} / {progress.totalScenes} {sceneLabel}
            </span>
            {progress.failedScenes > 0 && (
              <span className="text-destructive">{progress.failedScenes} hibás</span>
            )}
            {progress.skippedScenes > 0 && (
              <span className="text-amber-500">{progress.skippedScenes} kihagyva</span>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Chapter list */}
        <div className="w-64 border-r border-border bg-muted/30">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm">Fejezetek</h2>
          </div>
          <ScrollArea className="h-[calc(100%-53px)]">
            <div className="p-2 space-y-1">
              {chapters.map((chapter, index) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "p-3 rounded-lg transition-all",
                    chapter.status === "writing" && "bg-primary/10 border border-primary/30",
                    chapter.status === "done" && "bg-green-500/10",
                    chapter.status === "waiting" && "bg-card"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {chapter.status === "done" && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    )}
                    {chapter.status === "writing" && (
                      <Loader2 className="w-4 h-4 text-primary animate-spin mt-0.5 shrink-0" />
                    )}
                    {chapter.status === "waiting" && (
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {index + 1}. {chapter.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {chapter.wordCount.toLocaleString()} szó
                        {chapter.scenesTotal > 0 && (
                          <span className="ml-2">
                            ({chapter.scenesCompleted}/{chapter.scenesTotal})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right content - Current writing */}
        <div className="flex-1 flex flex-col">
          {progress.status === "completed" ? (
            <div className="flex-1 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md"
              >
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">A könyved elkészült! 🎉</h2>
                <p className="text-muted-foreground mb-6">
                  {progress.totalWords.toLocaleString()} szó, {chapters.length} fejezet
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={handleGoToEditor}>
                    <FileEdit className="w-4 h-4 mr-2" />
                    Szerkesztés
                  </Button>
                  <Button onClick={handleGoToExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportálás
                  </Button>
                </div>
              </motion.div>
            </div>
          ) : creditCheckDone && !hasCredits && progress.status === "idle" ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-10 h-10 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Nincs elég kredit!</h2>
                <p className="text-muted-foreground mb-2">
                  {remainingWords === 0 
                    ? "Elfogytak a szavaid erre a hónapra." 
                    : `Csak ${remainingWords.toLocaleString()} szó maradt.`}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Az automatikus könyvíráshoz extra kredit szükséges.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={handleGoToEditor}>
                    <FileEdit className="w-4 h-4 mr-2" />
                    Manuális szerkesztés
                  </Button>
                  <Button onClick={() => setShowBuyCreditModal(true)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Kredit vásárlás
                  </Button>
                </div>
              </div>
            </div>
          ) : progress.status === "error" ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">😕</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">Hiba történt</h2>
                <p className="text-muted-foreground mb-4">
                  {progress.error || "Ismeretlen hiba történt az írás közben."}
                </p>
                {(progress.failedScenes > 0 || progress.skippedScenes > 0) && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {progress.failedScenes + progress.skippedScenes} jelenet sikertelen
                  </p>
                )}
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={resume}>
                    <Play className="w-4 h-4 mr-2" />
                    Folytatás
                  </Button>
                  <Button 
                    onClick={restartFailedScenes}
                    disabled={progress.failedScenes === 0 && progress.skippedScenes === 0}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Hibás jelenetek újragenerálása
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Current chapter header */}
              <div className="px-6 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {chapters[progress.currentChapterIndex]?.title || "Előkészítés..."}
                  </span>
                  {progress.status === "writing" && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin ml-auto" />
                  )}
                </div>
              </div>

              {/* Content area */}
              <ScrollArea 
                ref={contentRef} 
                className="flex-1 p-6"
              >
                {currentContent ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {currentContent.split("\n\n").map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                    {streamingText && (
                      <p className="text-primary">{streamingText}</p>
                    )}
                  </div>
                ) : progress.status === "writing" || progress.status === "generating_outline" ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <span className="text-muted-foreground">
                        {progress.status === "generating_outline" 
                          ? isNonFiction ? "Szekció vázlat generálása..." : "Jelenet vázlat generálása..."
                          : isNonFiction ? "Szekció írása..." : "Jelenet írása..."
                        }
                      </span>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[95%]" />
                    <Skeleton className="h-4 w-[80%]" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[85%]" />
                  </div>
                ) : progress.status === "paused" ? (
                  <div className="text-center py-12">
                    <Pause className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Az írás szüneteltetve</p>
                    <Button onClick={resume} className="mt-4">
                      <Play className="w-4 h-4 mr-2" />
                      Folytatás
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">Előkészítés...</p>
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>
      </div>

      <BuyCreditModal 
        open={showBuyCreditModal} 
        onOpenChange={setShowBuyCreditModal} 
      />

      {/* Real-time writing progress modal - látható minden nem-idle státuszban */}
      <WritingProgressModal
        open={progress.status !== "idle"}
        status={progress.status}
        currentChapter={chapters[progress.currentChapterIndex]?.title || ""}
        currentScene={progress.currentSceneTitle || (chapters[progress.currentChapterIndex]?.scenesTotal > 0 
          ? `${isNonFiction ? "Szekció" : "Jelenet"} ${progress.currentSceneIndex + 1}/${chapters[progress.currentChapterIndex]?.scenesTotal || 0}` 
          : "")}
        completedScenes={progress.completedScenes}
        totalScenes={progress.totalScenes}
        streamingText={streamingText || currentContent.slice(-500)}
        totalWords={progress.totalWords}
        isNonFiction={isNonFiction}
        initialEstimatedMinutes={estimatedMinutes}
        failedScenes={progress.failedScenes}
        skippedScenes={progress.skippedScenes}
        avgSecondsPerScene={progress.avgSecondsPerScene}
        error={progress.error}
        // Kredit adatok
        remainingWords={remainingWords}
        usedWordsThisSession={progress.totalWords}
        extraWordsBalance={subscription?.extraWordsBalance || 0}
        monthlyWordLimit={subscription?.monthlyWordLimit || 0}
        monthlyWordsUsed={usage?.wordsGenerated || 0}
        // Callbacks
        onPause={pause}
        onResume={resume}
        onRestartFailed={restartFailedScenes}
        onOpenEditor={handleGoToEditor}
      />

      {/* Resume writing dialog */}
      {savedState && (
        <ResumeWritingDialog
          open={showResumeDialog}
          savedProgress={{
            completedScenes: savedState.completedScenes,
            totalScenes: savedState.totalScenes,
            totalWords: savedState.totalWords,
          }}
          onResume={handleResume}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
