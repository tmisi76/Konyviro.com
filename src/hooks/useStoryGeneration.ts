import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GeneratedStory } from "@/types/story";
import { useSubscription } from "@/hooks/useSubscription";

const GENERATE_STORY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-story`;

interface UseStoryGenerationOptions {
  genre?: string;
  tone?: string;
  targetAudience?: string;
}

export function useStoryGeneration(options: UseStoryGenerationOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<GeneratedStory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const { canGenerateWords, getRemainingWords } = useSubscription();

  const generate = useCallback(async (storyIdea: string, estimatedWords: number = 1000): Promise<GeneratedStory | null> => {
    if (!storyIdea.trim()) {
      toast.error("Kérlek adj meg egy sztori ötletet");
      return null;
    }

    // Check if user can generate words
    if (!canGenerateWords(estimatedWords)) {
      setLimitReached(true);
      const remaining = getRemainingWords();
      toast.error(`AI limit elérve! ${remaining === 0 ? "Nincs több szavad erre a hónapra." : `Csak ${remaining} szó maradt.`}`);
      return null;
    }

    setIsGenerating(true);
    setError(null);
    setLimitReached(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(GENERATE_STORY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          storyIdea,
          genre: options.genre,
          tone: options.tone,
          targetAudience: options.targetAudience,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Generálási hiba");
      }

      const storyData: GeneratedStory = await response.json();
      setGeneratedStory(storyData);
      toast.success("Sztori sikeresen generálva!");
      return storyData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ismeretlen hiba";
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [options.genre, options.tone, options.targetAudience, canGenerateWords, getRemainingWords]);

  const reset = useCallback(() => {
    setGeneratedStory(null);
    setError(null);
    setLimitReached(false);
  }, []);

  return {
    isGenerating,
    generatedStory,
    error,
    limitReached,
    remainingWords: getRemainingWords(),
    generate,
    reset,
    setGeneratedStory,
  };
}
