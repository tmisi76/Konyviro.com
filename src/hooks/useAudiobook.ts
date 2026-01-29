import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Audiobook, AudiobookChapter, TTSVoice, CreateAudiobookInput } from "@/types/audiobook";

export function useAudiobook(projectId: string) {
  const queryClient = useQueryClient();

  // Fetch existing audiobook for project
  const { data: audiobook, isLoading } = useQuery({
    queryKey: ["audiobook", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audiobooks")
        .select(`
          *,
          voice:tts_voices(*)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as (Audiobook & { voice: TTSVoice }) | null;
    },
    enabled: !!projectId,
  });

  // Fetch audiobook chapters
  const { data: chapters } = useQuery({
    queryKey: ["audiobook-chapters", audiobook?.id],
    queryFn: async () => {
      if (!audiobook?.id) return [];

      const { data, error } = await supabase
        .from("audiobook_chapters")
        .select(`
          *,
          chapter:chapters(id, title, word_count)
        `)
        .eq("audiobook_id", audiobook.id)
        .order("sort_order");

      if (error) throw error;
      return data as AudiobookChapter[];
    },
    enabled: !!audiobook?.id,
    refetchInterval: audiobook?.status === "processing" ? 5000 : false,
  });

  // Start audiobook generation
  const startGeneration = useMutation({
    mutationFn: async (input: CreateAudiobookInput) => {
      const { data, error } = await supabase.functions.invoke("start-audiobook-generation", {
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audiobook", projectId] });
      toast.success("Hangoskönyv generálás elindítva!");
    },
    onError: (error) => {
      toast.error("Hiba a hangoskönyv generálás indításakor: " + error.message);
    },
  });

  // Get signed URL for audio file
  const getAudioUrl = async (path: string): Promise<string | null> => {
    if (!path) return null;
    
    const { data, error } = await supabase.storage
      .from("audiobooks")
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }
    return data.signedUrl;
  };

  return {
    audiobook,
    chapters,
    isLoading,
    startGeneration,
    getAudioUrl,
  };
}

// Hook for fetching TTS voices
export function useTTSVoices() {
  return useQuery({
    queryKey: ["tts-voices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tts_voices")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as TTSVoice[];
    },
  });
}

// Hook for voice preview
export function useVoicePreview() {
  return useMutation({
    mutationFn: async ({ voiceId, sampleText }: { voiceId: string; sampleText: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ voiceId, sampleText }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Hiba a hang előnézeténél");
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
