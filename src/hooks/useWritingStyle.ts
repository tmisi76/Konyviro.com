import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WritingSample {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  createdAt: string;
}

export interface StyleProfile {
  avgSentenceLength: number | null;
  vocabularyComplexity: number | null;
  dialogueRatio: number | null;
  commonPhrases: string[];
  toneAnalysis: {
    formality?: number;
    emotionality?: number;
    humor?: number;
    descriptiveness?: number;
  };
  styleSummary: string | null;
  samplesAnalyzed: number;
  analyzedAt: string | null;
}

const defaultStyleProfile: StyleProfile = {
  avgSentenceLength: null,
  vocabularyComplexity: null,
  dialogueRatio: null,
  commonPhrases: [],
  toneAnalysis: {},
  styleSummary: null,
  samplesAnalyzed: 0,
  analyzedAt: null,
};

export function useWritingStyle() {
  const { user } = useAuth();
  const [samples, setSamples] = useState<WritingSample[]>([]);
  const [styleProfile, setStyleProfile] = useState<StyleProfile>(defaultStyleProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const fetchData = useCallback(async () => {
    if (!user) {
      setSamples([]);
      setStyleProfile(defaultStyleProfile);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch samples
      const { data: samplesData, error: samplesError } = await supabase
        .from("user_writing_samples")
        .select("id, title, content, word_count, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (samplesError) throw samplesError;

      setSamples(
        (samplesData || []).map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          wordCount: s.word_count,
          createdAt: s.created_at,
        }))
      );

      // Fetch style profile
      const { data: profileData, error: profileError } = await supabase
        .from("user_style_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      if (profileData) {
        setStyleProfile({
          avgSentenceLength: profileData.avg_sentence_length,
          vocabularyComplexity: profileData.vocabulary_complexity,
          dialogueRatio: profileData.dialogue_ratio,
          commonPhrases: (profileData.common_phrases as string[]) || [],
          toneAnalysis: (profileData.tone_analysis as StyleProfile["toneAnalysis"]) || {},
          styleSummary: profileData.style_summary,
          samplesAnalyzed: profileData.samples_analyzed || 0,
          analyzedAt: profileData.analyzed_at,
        });
      }
    } catch (error) {
      console.error("Error fetching style data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addSample = async (title: string, content: string) => {
    if (!user) return false;

    setIsSaving(true);
    try {
      const wordCount = countWords(content);
      
      const { error } = await supabase
        .from("user_writing_samples")
        .insert({
          user_id: user.id,
          title,
          content,
          word_count: wordCount,
        });

      if (error) throw error;

      await fetchData();
      toast.success("Szövegminta hozzáadva");
      return true;
    } catch (error) {
      console.error("Error adding sample:", error);
      toast.error("Nem sikerült hozzáadni a mintát");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSample = async (sampleId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_writing_samples")
        .delete()
        .eq("id", sampleId)
        .eq("user_id", user.id);

      if (error) throw error;

      setSamples((prev) => prev.filter((s) => s.id !== sampleId));
      toast.success("Szövegminta törölve");
    } catch (error) {
      console.error("Error deleting sample:", error);
      toast.error("Nem sikerült törölni a mintát");
    }
  };

  const analyzeStyle = async () => {
    if (!user) return false;
    if (samples.length === 0) {
      toast.error("Adj hozzá legalább egy szövegmintát az elemzéshez");
      return false;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-writing-style");

      if (error) throw error;

      if (data?.analysis) {
        setStyleProfile({
          avgSentenceLength: data.analysis.avg_sentence_length,
          vocabularyComplexity: data.analysis.vocabulary_complexity,
          dialogueRatio: data.analysis.dialogue_ratio,
          commonPhrases: data.analysis.common_phrases || [],
          toneAnalysis: data.analysis.tone_analysis || {},
          styleSummary: data.analysis.style_summary,
          samplesAnalyzed: data.samplesAnalyzed || samples.length,
          analyzedAt: new Date().toISOString(),
        });
      }

      toast.success("Stílus elemzés elkészült!");
      return true;
    } catch (error) {
      console.error("Error analyzing style:", error);
      toast.error(error instanceof Error ? error.message : "Elemzési hiba");
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasStyleProfile = Boolean(styleProfile.styleSummary && styleProfile.analyzedAt);

  return {
    samples,
    styleProfile,
    hasStyleProfile,
    isLoading,
    isAnalyzing,
    isSaving,
    addSample,
    deleteSample,
    analyzeStyle,
    refetch: fetchData,
  };
}
