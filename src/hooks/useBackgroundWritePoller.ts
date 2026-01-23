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
  failed: number;
  skipped: number;
  currentChapter?: string;
  currentScene?: string;
}

interface OutlineProgress {
  total: number;
  completed: number;
  currentChapter?: string;
}

type Phase = "outlines" | "writing" | "idle";

// Auto-recovery configuration
const MAX_RETRIES = 10;
const RECOVERY_DELAY_MS = 30000; // 30 seconds before auto-recovery

export function useBackgroundWritePoller({
  projectId,
  writingStatus,
  enabled = true,
  onUpdate,
}: UseBackgroundWritePollerOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sceneProgress, setSceneProgress] = useState<SceneProgress>({ 
    total: 0, 
    completed: 0, 
    failed: 0, 
    skipped: 0 
  });
  const [outlineProgress, setOutlineProgress] = useState<OutlineProgress>({ total: 0, completed: 0 });
  const retryCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      let failedScenes = 0;
      let skippedScenes = 0;
      let currentChapter: string | undefined;
      let currentScene: string | undefined;

      for (const chapter of chaptersWithOutlines) {
        const outline = chapter.scene_outline as Array<{ status?: string; title?: string }>;
        
        for (const scene of outline) {
          if (!scene) continue;
          totalScenes++;
          
          if (scene.status === "completed" || scene.status === "done") {
            completedScenes++;
          } else if (scene.status === "failed") {
            failedScenes++;
          } else if (scene.status === "skipped") {
            skippedScenes++;
          } else if (!currentChapter && (scene.status === "pending" || scene.status === "writing")) {
            currentChapter = chapter.title;
            currentScene = scene.title;
          }
        }
      }

      setSceneProgress({
        total: totalScenes,
        completed: completedScenes,
        failed: failedScenes,
        skipped: skippedScenes,
        currentChapter,
        currentScene,
      });

      // Determine phase
      const outlinesComplete = chaptersWithOutlines.length >= chapters.length;
      const allScenesProcessed = completedScenes + failedScenes + skippedScenes >= totalScenes;
      
      let currentPhase: Phase;
      
      if (!outlinesComplete) {
        currentPhase = "outlines";
      } else if (!allScenesProcessed) {
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
        
        // Auto-recovery: don't stop after max retries, just delay and try again
        if (retryCountRef.current >= MAX_RETRIES) {
          console.log(`Max retries (${MAX_RETRIES}) reached for outline, will retry after delay`);
          retryCountRef.current = 0;
          return true; // Continue but with delay
        }
        return true; // Retry
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
      return retryCountRef.current < MAX_RETRIES;
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
        
        // Auto-recovery: don't stop completely, delay and retry
        if (retryCountRef.current >= MAX_RETRIES) {
          console.log(`Max retries (${MAX_RETRIES}) reached for scene, scheduling recovery`);
          // Don't return false - schedule recovery instead
          recoveryTimeoutRef.current = setTimeout(() => {
            console.log("Auto-recovery: restarting after max retries");
            retryCountRef.current = 0;
            isProcessingRef.current = false;
            runProcessingLoop();
          }, RECOVERY_DELAY_MS);
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

      // Handle failed/skipped scenes - continue processing
      if (data?.status === "scene_failed" || data?.status === "scene_skipped") {
        console.log(`Scene ${data.status}, continuing to next...`);
        return true; // Continue with next scene
      }

      if (data?.status === "completed" || data?.status === "stopped") {
        console.log(`Writing finished with status: ${data.status}`);
        return false;
      }

      if (data?.status === "failed") {
        console.log("Writing failed, but may have partial progress");
        // Don't completely stop - let the UI handle restart
        return false;
      }

      return false;
    } catch (error) {
      console.error("Error in processNextScene:", error);
      retryCountRef.current++;
      
      if (retryCountRef.current >= MAX_RETRIES) {
        // Schedule auto-recovery
        recoveryTimeoutRef.current = setTimeout(() => {
          console.log("Auto-recovery after error");
          retryCountRef.current = 0;
          isProcessingRef.current = false;
        }, RECOVERY_DELAY_MS);
        return false;
      }
      
      return true;
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
      
      // Auto-recovery on unexpected errors
      recoveryTimeoutRef.current = setTimeout(() => {
        console.log("Auto-recovery from processing loop error");
        isProcessingRef.current = false;
        runProcessingLoop();
      }, RECOVERY_DELAY_MS);
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
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
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
