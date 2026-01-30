import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";

const PROOFREADING_CREDIT_MULTIPLIER = 0.08;
const PROOFREADING_MIN_CREDITS = 100;

export function calculateChapterCredits(wordCount: number): number {
  const calculated = Math.round(wordCount * PROOFREADING_CREDIT_MULTIPLIER);
  return Math.max(calculated, PROOFREADING_MIN_CREDITS);
}

interface UseChapterProofreadingOptions {
  onComplete?: (newContent: string) => void;
  onError?: (error: string) => void;
}

export function useChapterProofreading(options?: UseChapterProofreadingOptions) {
  const [isProofreading, setIsProofreading] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [progress, setProgress] = useState(0);
  const { getRemainingWords } = useSubscription();

  const proofreadChapter = useCallback(async (chapterId: string, wordCount: number) => {
    const creditsNeeded = calculateChapterCredits(wordCount);
    const availableCredits = getRemainingWords();

    if (availableCredits < creditsNeeded) {
      toast.error(`Nincs elég kredit! Szükséges: ${creditsNeeded}, elérhető: ${availableCredits}`);
      return false;
    }

    setIsProofreading(true);
    setStreamedContent("");
    setProgress(0);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        throw new Error("Nincs bejelentkezve");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proofread-chapter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ chapterId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Hiba a lektorálás során");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Stream not available");
      }

      const decoder = new TextDecoder();
      let fullContent = "";
      let totalChars = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              
              if (json.content) {
                fullContent += json.content;
                totalChars += json.content.length;
                setStreamedContent(fullContent);
                // Estimate progress based on expected output length
                const estimatedTotal = wordCount * 5; // Rough char estimate
                setProgress(Math.min(95, (totalChars / estimatedTotal) * 100));
              }
              
              if (json.done) {
                setProgress(100);
                options?.onComplete?.(fullContent);
                
                toast.success("Fejezet sikeresen lektorálva!", {
                  description: `${json.wordCount || 0} szó`,
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error("Proofreading error:", error);
      const message = error instanceof Error ? error.message : "Ismeretlen hiba";
      toast.error(message);
      options?.onError?.(message);
      return false;
    } finally {
      setIsProofreading(false);
    }
  }, [getRemainingWords, options]);

  const reset = useCallback(() => {
    setStreamedContent("");
    setProgress(0);
  }, []);

  return {
    proofreadChapter,
    isProofreading,
    streamedContent,
    progress,
    reset,
    calculateChapterCredits,
  };
}
