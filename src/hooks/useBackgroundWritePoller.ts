import { useEffect, useRef, useCallback, useState } from "react";
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

/**
 * Hook that polls for background writing progress and triggers next scene processing.
 * This is needed because edge functions have a 60 second timeout,
 * so we need to keep the chain going from the client side.
 */
export function useBackgroundWritePoller({
  projectId,
  writingStatus,
  enabled = true,
  onUpdate,
}: UseBackgroundWritePollerOptions) {
  const isProcessingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const [sceneProgress, setSceneProgress] = useState<SceneProgress>({ total: 0, completed: 0 });

  const fetchProgress = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data: chapters } = await supabase
        .from("chapters")
        .select("title, scene_outline")
        .eq("project_id", projectId)
        .order("sort_order");

      if (chapters) {
        let total = 0;
        let completed = 0;
        let currentChapter: string | undefined;

        for (const ch of chapters) {
          const scenes = (ch.scene_outline as any[]) || [];
          total += scenes.length;
          const chapterCompleted = scenes.filter(
            (s) => s?.status === "done" || s?.status === "completed"
          ).length;
          completed += chapterCompleted;

          // Find current chapter (has pending or writing scenes)
          if (!currentChapter && chapterCompleted < scenes.length && scenes.length > 0) {
            currentChapter = ch.title;
          }
        }

        setSceneProgress({ total, completed, currentChapter });
      }
    } catch (error) {
      console.error("Error fetching scene progress:", error);
    }
  }, [projectId]);

  const processNextScene = useCallback(async () => {
    if (!projectId || isProcessingRef.current) return;

    isProcessingRef.current = true;
    try {
      console.log("Processing next scene for project:", projectId);
      
      const { data, error } = await supabase.functions.invoke("process-next-scene", {
        body: { projectId },
      });

      if (error) {
        console.error("Error processing next scene:", error);
        retryCountRef.current++;
        
        // Retry with exponential backoff (max 5 retries)
        if (retryCountRef.current <= 5) {
          const delay = Math.min(10000 * Math.pow(2, retryCountRef.current - 1), 60000);
          console.log(`Retrying in ${delay}ms (attempt ${retryCountRef.current})`);
          timeoutRef.current = setTimeout(() => {
            isProcessingRef.current = false;
            processNextScene();
          }, delay);
        }
        return;
      }

      // Reset retry count on success
      retryCountRef.current = 0;

      // Fetch updated progress
      await fetchProgress();

      // Call update callback
      onUpdate?.();

      // If status is "scene_completed", schedule next processing
      if (data?.status === "scene_completed") {
        // Wait 10 seconds before processing next scene to avoid rate limits
        timeoutRef.current = setTimeout(() => {
          isProcessingRef.current = false;
          processNextScene();
        }, 10000);
      } else if (data?.status === "completed" || data?.status === "stopped") {
        // Writing is done
        console.log("Background writing completed");
        isProcessingRef.current = false;
      } else if (data?.status === "failed") {
        console.error("Background writing failed:", data?.error);
        isProcessingRef.current = false;
      } else {
        // Unknown status, stop processing
        console.log("Unknown status, stopping:", data?.status);
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error("Error in processNextScene:", error);
      isProcessingRef.current = false;
      
      // Retry on network errors
      retryCountRef.current++;
      if (retryCountRef.current <= 5) {
        const delay = Math.min(10000 * Math.pow(2, retryCountRef.current - 1), 60000);
        timeoutRef.current = setTimeout(() => {
          processNextScene();
        }, delay);
      }
    }
  }, [projectId, onUpdate, fetchProgress]);

  useEffect(() => {
    // Only start polling if we're in background_writing status and enabled
    if (!enabled || writingStatus !== "background_writing" || !projectId) {
      return;
    }

    console.log("Starting background write poller for project:", projectId);

    // Fetch initial progress
    fetchProgress();

    // Start the processing chain immediately
    const initialTimeout = setTimeout(() => {
      processNextScene();
    }, 1000);

    // Also set up a periodic progress fetch (in case we miss updates)
    const progressInterval = setInterval(fetchProgress, 5000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(progressInterval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      isProcessingRef.current = false;
      retryCountRef.current = 0;
    };
  }, [enabled, writingStatus, projectId, processNextScene, fetchProgress]);

  return {
    isProcessing: isProcessingRef.current,
    sceneProgress,
  };
}
