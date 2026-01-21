import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export interface CoachSummary {
  complete: boolean;
  summary: {
    // Szakkönyv fields
    topic?: string;
    audience?: string;
    keyLearnings?: string[];
    existingContent?: string;
    targetLength?: string;
    toneRecommendation?: string;
    // Fiction fields
    subgenre?: string;
    protagonist?: string;
    mainGoal?: string;
    conflict?: string;
    setting?: string;
    ending?: string;
    characterSuggestions?: string[];
    // Erotikus fields
    protagonists?: string;
    relationshipDynamic?: string;
    storyArc?: string;
    explicitLevel?: string;
    pacingSuggestions?: string;
    // Common
    suggestedOutline?: string[];
  };
}

const COACH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/book-coach`;

const INITIAL_MESSAGES: Record<string, string> = {
  szakkönyv: "Szia! Segítek megtervezni a szakkönyvedet. Mi a könyved fő témája?",
  fiction: "Szia! Segítek megtervezni a regényedet. Milyen műfajban gondolkodsz? (fantasy, krimi, romantikus, sci-fi, dráma, stb.)",
  erotikus: "Szia! Segítek megtervezni az erotikus történetedet. Milyen alműfaj érdekel? (romantikus erotika, BDSM, paranormális, stb.)",
};

export function useBookCoach(genre: string) {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: INITIAL_MESSAGES[genre] || INITIAL_MESSAGES.fiction,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<CoachSummary | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    // Add user message
    const userMsg: CoachMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage.trim(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Build messages for API (exclude streaming flag and id)
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(COACH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages, genre }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Hiba a coach válaszában");
      }

      if (!response.body) {
        throw new Error("Nincs válasz a szervertől");
      }

      // Add streaming assistant message
      const assistantId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      }]);

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

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
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, content: fullText }
                  : m
              ));
            }
          } catch {
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
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, content: fullText }
                  : m
              ));
            }
          } catch { /* ignore */ }
        }
      }

      // Finalize streaming
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, isStreaming: false }
          : m
      ));

      // Check if response contains summary JSON
      const jsonMatch = fullText.match(/\{[\s\S]*"complete"\s*:\s*true[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const summaryData = JSON.parse(jsonMatch[0]) as CoachSummary;
          if (summaryData.complete) {
            setSummary(summaryData);
          }
        } catch {
          // Not valid JSON, continue conversation
        }
      }

      setIsLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setIsLoading(false);
        return;
      }
      console.error("Coach error:", err);
      setIsLoading(false);
      // Remove the streaming message on error
      setMessages(prev => prev.filter(m => !m.isStreaming));
    }
  }, [messages, genre, isLoading]);

  const reset = useCallback(() => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: INITIAL_MESSAGES[genre] || INITIAL_MESSAGES.fiction,
      },
    ]);
    setSummary(null);
  }, [genre]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    summary,
    sendMessage,
    reset,
    cancel,
  };
}
