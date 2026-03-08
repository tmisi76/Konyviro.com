import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProofSuggestion {
  id: string;
  original: string;
  suggestion: string;
  type: "grammar" | "spelling" | "style" | "punctuation";
  explanation: string;
  position?: { start: number; end: number };
}

export function useProofreading() {
  const [suggestions, setSuggestions] = useState<ProofSuggestion[]>([]);
  const [isProofreading, setIsProofreading] = useState(false);

  const proofread = async (text: string) => {
    if (!text.trim()) {
      toast.error("Nincs szöveg a lektoráláshoz");
      return;
    }

    setIsProofreading(true);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke("proofread", {
        body: { text, language: "hu" },
      });

      if (error) throw error;

      const results = (data?.suggestions || []).map(
        (s: any, i: number) =>
          ({
            id: `proof-${i}`,
            original: s.original || "",
            suggestion: s.suggestion || "",
            type: s.type || "grammar",
            explanation: s.explanation || "",
            position: s.position,
          } as ProofSuggestion)
      );

      setSuggestions(results);

      if (results.length === 0) {
        toast.success("Nem találtam hibát! 🎉");
      } else {
        toast.info(`${results.length} javaslat találva`);
      }
    } catch (err: any) {
      console.error("Proofread error:", err);
      toast.error("Hiba a lektorálás során");
    } finally {
      setIsProofreading(false);
    }
  };

  const acceptSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const rejectSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const clearSuggestions = () => setSuggestions([]);

  return {
    suggestions,
    isProofreading,
    proofread,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestions,
  };
}
