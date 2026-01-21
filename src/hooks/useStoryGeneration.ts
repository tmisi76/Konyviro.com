import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GeneratedStory } from "@/types/story";

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

  const generate = useCallback(async (storyIdea: string): Promise<GeneratedStory | null> => {
    if (!storyIdea.trim()) {
      toast.error("Kérlek adj meg egy sztori ötletet");
      return null;
    }

    setIsGenerating(true);
    setError(null);

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
  }, [options.genre, options.tone, options.targetAudience]);

  const reset = useCallback(() => {
    setGeneratedStory(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    generatedStory,
    error,
    generate,
    reset,
    setGeneratedStory,
  };
}
