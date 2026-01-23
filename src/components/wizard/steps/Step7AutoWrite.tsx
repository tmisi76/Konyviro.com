import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAutoWrite } from "@/hooks/useAutoWrite";
import { useSubscription } from "@/hooks/useSubscription";
import { useWritingPersistence, PersistedWritingState } from "@/hooks/useWritingPersistence";
import { useCompletionCelebration } from "@/hooks/useCompletionCelebration";
import { WritingProgressPage } from "@/components/writing/WritingProgressPage";
import { BuyCreditModal } from "@/components/credits/BuyCreditModal";
import { ResumeWritingDialog } from "@/components/wizard/ResumeWritingDialog";
import type { Genre } from "@/types/wizard";
import type { SceneOutline } from "@/types/autowrite";

interface Step7AutoWriteProps {
  projectId: string;
  genre: Genre;
  estimatedMinutes?: number;
  onComplete: () => void;
}

interface ChapterDisplay {
  id: string;
  title: string;
  scenesTotal: number;
  scenesCompleted: number;
}

export function Step7AutoWrite({ projectId, genre, estimatedMinutes, onComplete }: Step7AutoWriteProps) {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<ChapterDisplay[]>([]);
  const [currentContent, setCurrentContent] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [storyStructure, setStoryStructure] = useState<Record<string, unknown> | undefined>();
  const [targetWordCount, setTargetWordCount] = useState<number>(0);
  const [showBuyCreditModal, setShowBuyCreditModal] = useState(false);
  const [creditCheckDone, setCreditCheckDone] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedState, setSavedState] = useState<PersistedWritingState | null>(null);
  const [resumeDecisionMade, setResumeDecisionMade] = useState(false);
  const hasStartedRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressRef = useRef(0);

  const { getRemainingWords, canGenerateWords, isLoading: subscriptionLoading, subscription, usage } = useSubscription();
  const { saveProgress, clearProgress, loadProgress } = useWritingPersistence(projectId);
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
    targetWordCount,
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
      if (lastProgressRef.current === progress.completedScenes) {
        watchdogRef.current = setTimeout(() => {
          console.log("Watchdog: no progress for 3 minutes, attempting auto-resume...");
          resume();
        }, 180000);
      } else {
        lastProgressRef.current = progress.completedScenes;
      }
      
      return () => {
        if (watchdogRef.current) {
          clearTimeout(watchdogRef.current);
        }
      };
    }
  }, [progress.status, progress.completedScenes, resume]);

  // Fetch project info including target_word_count
  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from("projects")
        .select("title, story_structure, target_word_count")
        .eq("id", projectId)
        .single();

      if (data) {
        if (data.story_structure) {
          setStoryStructure(data.story_structure as Record<string, unknown>);
        }
        if (data.target_word_count) {
          setTargetWordCount(data.target_word_count);
        }
      }
    };

    fetchProject();
  }, [projectId]);

  // Fetch chapters
  const fetchChapters = useCallback(async () => {
    const { data } = await supabase
      .from("chapters")
      .select("id, title, scene_outline")
      .eq("project_id", projectId)
      .order("sort_order");

    if (data) {
      const mapped: ChapterDisplay[] = data.map((ch) => {
        const scenes = (ch.scene_outline as unknown as SceneOutline[]) || [];
        const completedScenes = scenes.filter(s => s && s.status === "done").length;

        return {
          id: ch.id,
          title: ch.title,
          scenesTotal: scenes.length,
          scenesCompleted: completedScenes,
        };
      });
      
      setChapters(mapped);
    }
  }, [projectId]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  // Credit check
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

  const handleResume = () => {
    setShowResumeDialog(false);
    setResumeDecisionMade(true);
  };

  const handleRestart = () => {
    setShowResumeDialog(false);
    setResumeDecisionMade(true);
    clearProgress();
  };

  // Auto-start writing - wait for chapters to be loaded first
  useEffect(() => {
    if (subscriptionLoading) return;
    setCreditCheckDone(true);
    
    if (!resumeDecisionMade) return;
    
    // CRITICAL: Wait for chapters to be loaded before starting (fixes race condition)
    if (!hasStartedRef.current && projectId && storyStructure !== undefined && hasCredits && chapters.length > 0) {
      hasStartedRef.current = true;
      setTimeout(() => {
        startAutoWrite();
      }, 500);
    }
  }, [projectId, storyStructure, startAutoWrite, subscriptionLoading, hasCredits, resumeDecisionMade, chapters.length]);

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

  // Save progress to localStorage
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

  // Celebrate on completion
  useEffect(() => {
    if (progress.status === "completed") {
      celebrate();
    }
  }, [progress.status, celebrate]);

  const isNonFiction = genre === "szakkonyv";

  const handleGoToEditor = () => {
    navigate(`/project/${projectId}`);
  };

  // Map internal status to page status
  const mapStatus = (): "idle" | "generating_outline" | "writing" | "paused" | "error" | "completed" => {
    // Show credit error screen if no credits and idle
    if (creditCheckDone && !hasCredits && progress.status === "idle") {
      return "error";
    }
    return progress.status;
  };

  const currentChapterTitle = chapters[progress.currentChapterIndex]?.title || "";
  const currentSceneInfo = progress.currentSceneTitle || (
    chapters[progress.currentChapterIndex]?.scenesTotal > 0 
      ? `${isNonFiction ? "Szekció" : "Jelenet"} ${progress.currentSceneIndex + 1}/${chapters[progress.currentChapterIndex]?.scenesTotal || 0}` 
      : ""
  );

  return (
    <>
      <WritingProgressPage
        status={mapStatus()}
        currentChapter={currentChapterTitle}
        currentScene={currentSceneInfo}
        completedScenes={progress.completedScenes}
        totalScenes={progress.totalScenes}
        streamingText={streamingText || currentContent.slice(-500)}
        totalWords={progress.totalWords}
        isNonFiction={isNonFiction}
        initialEstimatedMinutes={estimatedMinutes}
        failedScenes={progress.failedScenes}
        skippedScenes={progress.skippedScenes}
        avgSecondsPerScene={progress.avgSecondsPerScene}
        targetWordCount={targetWordCount}
        error={
          creditCheckDone && !hasCredits && progress.status === "idle"
            ? `Nincs elég kredit! ${remainingWords === 0 ? "Elfogytak a szavaid erre a hónapra." : `Csak ${remainingWords.toLocaleString()} szó maradt.`}`
            : progress.error
        }
        usedWordsThisSession={progress.totalWords}
        extraWordsBalance={subscription?.extraWordsBalance || 0}
        monthlyWordLimit={subscription?.monthlyWordLimit || 0}
        monthlyWordsUsed={usage?.wordsGenerated || 0}
        onPause={pause}
        onResume={resume}
        onRestartFailed={restartFailedScenes}
        onOpenEditor={handleGoToEditor}
      />

      <BuyCreditModal 
        open={showBuyCreditModal} 
        onOpenChange={setShowBuyCreditModal} 
      />

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
    </>
  );
}
