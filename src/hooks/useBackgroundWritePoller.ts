import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseBackgroundWritePollerOptions {
  projectId: string | null;
  writingStatus: string | null;
  enabled?: boolean;
  onUpdate?: () => void;
}

interface SceneProgress {
  total: number;
  completed: number;
  currentChapter?: string;
}

interface OutlineProgress {
  total: number;
  completed: number;
  currentChapter?: string;
}

type Phase = "outlines" | "writing" | "idle";

export function useBackgroundWritePoller({
  projectId,
  writingStatus,
  enabled = true,
  onUpdate,
}: UseBackgroundWritePollerOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sceneProgress, setSceneProgress] = useState<SceneProgress>({ total: 0, completed: 0 });
  const [outlineProgress, setOutlineProgress] = useState<OutlineProgress>({ total: 0, completed: 0 });
  const retryCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!projectId) return { phase: "idle" as Phase, outlinesComplete: false };

    try {
      const { data: chapters } = await supabase
        .from("chapters")
        .select("title, scene_outline")
        .eq("project_id", projectId);

      if (!chapters) return { phase: "idle" as Phase, outlinesComplete: false };

      // Calculate outline progress
      const chaptersWithOutlines = chapters.filter(
        (ch) => ch.scene_outline && Array.isArray(ch.scene_outline) && ch.scene_outline.length > 0
      );
      const chapterWithoutOutline = chapters.find(
        (ch) => !ch.scene_outline || (Array.isArray(ch.scene_outline) && ch.scene_outline.length === 0)
      );

      setOutlineProgress({
        total: chapters.length,
        completed: chaptersWithOutlines.length,
        currentChapter: chapterWithoutOutline?.title,
      });

      // Calculate scene progress (only for chapters with outlines)
      let totalScenes = 0;
      let completedScenes = 0;
      let currentChapter: string | undefined;

      for (const chapter of chaptersWithOutlines) {
        const outline = chapter.scene_outline as Array<{ status?: string }>;
        totalScenes += outline.length;
        const chapterCompletedScenes = outline.filter((s) => s.status === "completed" || s.status === "done").length;
        completedScenes += chapterCompletedScenes;

        if (!currentChapter && chapterCompletedScenes < outline.length) {
          currentChapter = chapter.title;
        }
      }

      setSceneProgress({
        total: totalScenes,
        completed: completedScenes,
        currentChapter,
      });

      // Determine phase
      const outlinesComplete = chaptersWithOutlines.length >= chapters.length;
      let currentPhase: Phase;
      
      if (!outlinesComplete) {
        currentPhase = "outlines";
      } else if (completedScenes < totalScenes) {
        currentPhase = "writing";
      } else {
        currentPhase = "idle";
      }
      
      setPhase(currentPhase);
      return { phase: currentPhase, outlinesComplete };
    } catch (error) {
      console.error("Error fetching progress:", error);
      return { phase: "idle" as Phase, outlinesComplete: false };
    }
  }, [projectId]);

  const processNextOutline = useCallback(async (): Promise<boolean> => {
    if (!projectId) return false;

    try {
      console.log("Processing next outline for project:", projectId);
      
      const { data, error } = await supabase.functions.invoke("generate-next-outline", {
        body: { projectId },
      });

      if (error) {
        console.error("Error generating outline:", error);
        retryCountRef.current++;
        return retryCountRef.current < 3;
      }

      retryCountRef.current = 0;
      onUpdate?.();

      if (data?.status === "outlines_complete") {
        console.log("All outlines complete, switching to writing phase");
        setPhase("writing");
        return true; // Continue to writing phase
      }

      if (data?.status === "outline_generated") {
        console.log(`Outline generated for: ${data.chapterTitle}`);
        return data.hasMore;
      }

      if (data?.status === "outline_error") {
        console.error(`Outline error for ${data.chapterTitle}:`, data.error);
        return true; // Continue with next chapter
      }

      if (data?.status === "stopped") {
        return false;
      }

      return false;
    } catch (error) {
      console.error("Error in processNextOutline:", error);
      retryCountRef.current++;
      return retryCountRef.current < 3;
    }
  }, [projectId, onUpdate]);

  const processNextScene = useCallback(async (): Promise<boolean> => {
    if (!projectId) return false;

    try {
      console.log("Processing next scene for project:", projectId);
      
      const { data, error } = await supabase.functions.invoke("process-next-scene", {
        body: { projectId },
      });

      if (error) {
        console.error("Error processing scene:", error);
        retryCountRef.current++;
        
        if (retryCountRef.current >= 5) {
          console.error("Max retries reached, stopping");
          return false;
        }
        
        return true; // Retry
      }

      retryCountRef.current = 0;
      onUpdate?.();

      if (data?.status === "scene_completed") {
        console.log(`Scene completed: ${data.wordsWritten} words`);
        return true;
      }

      if (data?.status === "completed" || data?.status === "stopped" || data?.status === "failed") {
        console.log(`Writing finished with status: ${data.status}`);
        return false;
      }

      return false;
    } catch (error) {
      console.error("Error in processNextScene:", error);
      retryCountRef.current++;
      return retryCountRef.current < 5;
    }
  }, [projectId, onUpdate]);

  const runProcessingLoop = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      const { phase: currentPhase, outlinesComplete } = await fetchProgress();

      // Process based on current phase
      if (currentPhase === "outlines" || !outlinesComplete) {
        const shouldContinue = await processNextOutline();
        if (shouldContinue) {
          // Schedule next outline processing (2 second delay)
          processingTimeoutRef.current = setTimeout(() => {
            isProcessingRef.current = false;
            runProcessingLoop();
          }, 2000);
          return;
        } else {
          // Check if we're done with outlines
          const { phase: newPhase } = await fetchProgress();
          if (newPhase === "writing") {
            // Continue to writing phase immediately
            isProcessingRef.current = false;
            runProcessingLoop();
            return;
          }
        }
      } else if (currentPhase === "writing") {
        const shouldContinue = await processNextScene();
        if (shouldContinue) {
          // Schedule next scene processing (5 second delay to avoid rate limits)
          processingTimeoutRef.current = setTimeout(() => {
            isProcessingRef.current = false;
            runProcessingLoop();
          }, 5000);
          return;
        }
      }
    } catch (error) {
      console.error("Error in processing loop:", error);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [fetchProgress, processNextOutline, processNextScene]);

  useEffect(() => {
    if (!enabled || !projectId || writingStatus !== "background_writing") {
      setPhase("idle");
      return;
    }

    console.log("Starting background write poller for project:", projectId);

    // Initial progress fetch and start processing
    fetchProgress().then(() => {
      // Small delay before starting to ensure UI is ready
      processingTimeoutRef.current = setTimeout(() => {
        runProcessingLoop();
      }, 1000);
    });

    // Set up polling for progress updates
    intervalRef.current = setInterval(() => {
      fetchProgress();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      isProcessingRef.current = false;
    };
  }, [enabled, projectId, writingStatus, fetchProgress, runProcessingLoop]);

  return {
    isProcessing,
    phase,
    sceneProgress,
    outlineProgress,
  };
}
