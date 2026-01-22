import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseBackgroundWritePollerOptions {
  projectId: string | null;
  writingStatus: string | null;
  enabled?: boolean;
  onUpdate?: () => void;
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processNextScene = useCallback(async () => {
    if (!projectId || isProcessingRef.current) return;

    isProcessingRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke("process-next-scene", {
        body: { projectId },
      });

      if (error) {
        console.error("Error processing next scene:", error);
        return;
      }

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
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error("Error in processNextScene:", error);
      isProcessingRef.current = false;
    }
  }, [projectId, onUpdate]);

  useEffect(() => {
    // Only start polling if we're in background_writing status and enabled
    if (!enabled || writingStatus !== "background_writing" || !projectId) {
      return;
    }

    // Start the processing chain with a small delay
    const initialTimeout = setTimeout(() => {
      processNextScene();
    }, 2000);

    return () => {
      clearTimeout(initialTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      isProcessingRef.current = false;
    };
  }, [enabled, writingStatus, projectId, processNextScene]);

  return {
    isProcessing: isProcessingRef.current,
  };
}
