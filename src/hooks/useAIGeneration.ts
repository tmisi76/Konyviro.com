import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AIAction = "continue" | "rewrite" | "shorten" | "expand" | "dialogue" | "description" | "chat";

export interface AISettings {
  creativity: number; // 0-100
  length: "short" | "medium" | "long";
  useProjectStyle: boolean;
}

export interface AIContext {
  bookDescription?: string;
  tone?: string;
  chapterContent?: string;
  characters?: string;
  sources?: string;
}

interface UseAIGenerationOptions {
  projectId: string;
  chapterId?: string;
  genre: string;
}

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`;

export function useAIGeneration({ projectId, chapterId, genre }: UseAIGenerationOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (
    action: AIAction,
    prompt: string,
    context: AIContext,
    settings: AISettings
  ) => {
    setIsGenerating(true);
    setGeneratedText("");
    setError(null);

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action,
          prompt,
          context,
          genre,
          settings,
          projectId,
          chapterId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Generálási hiba");
      }

      if (!response.body) {
        throw new Error("Nincs válasz a szervertől");
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process line-by-line
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setGeneratedText(fullText);
            }
          } catch {
            // Incomplete JSON, put back and wait
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Process remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setGeneratedText(fullText);
            }
          } catch { /* ignore */ }
        }
      }

      setIsGenerating(false);
      return fullText;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Request was cancelled, don't show error
        setIsGenerating(false);
        return null;
      }
      
      const errorMessage = err instanceof Error ? err.message : "Ismeretlen hiba";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsGenerating(false);
      return null;
    }
  }, [projectId, chapterId, genre]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  const reset = useCallback(() => {
    setGeneratedText("");
    setError(null);
  }, []);

  return {
    isGenerating,
    generatedText,
    error,
    generate,
    cancel,
    reset,
  };
}
