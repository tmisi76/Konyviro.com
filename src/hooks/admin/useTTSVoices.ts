import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TTSVoice } from "@/types/audiobook";

export interface CreateVoiceInput {
  elevenlabs_voice_id: string;
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  sample_text?: string;
}

export interface UpdateVoiceInput {
  name?: string;
  description?: string;
  gender?: 'male' | 'female' | 'neutral';
  language?: string;
  sample_text?: string;
  is_active?: boolean;
  sort_order?: number;
}

export function useAdminTTSVoices() {
  const queryClient = useQueryClient();

  // Fetch all voices (including inactive for admin)
  const { data: voices, isLoading } = useQuery({
    queryKey: ["admin-tts-voices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tts_voices")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data as TTSVoice[];
    },
  });

  // Create voice
  const createVoice = useMutation({
    mutationFn: async (input: CreateVoiceInput) => {
      // Get max sort_order
      const { data: maxOrder } = await supabase
        .from("tts_voices")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const { data, error } = await supabase
        .from("tts_voices")
        .insert({
          ...input,
          sort_order: (maxOrder?.sort_order || 0) + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TTSVoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tts-voices"] });
      queryClient.invalidateQueries({ queryKey: ["tts-voices"] });
      toast.success("Hang hozzáadva!");
    },
    onError: (error) => {
      toast.error("Hiba a hang hozzáadásakor: " + error.message);
    },
  });

  // Update voice
  const updateVoice = useMutation({
    mutationFn: async ({ voiceId, input }: { voiceId: string; input: UpdateVoiceInput }) => {
      const { data, error } = await supabase
        .from("tts_voices")
        .update(input)
        .eq("id", voiceId)
        .select()
        .single();

      if (error) throw error;
      return data as TTSVoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tts-voices"] });
      queryClient.invalidateQueries({ queryKey: ["tts-voices"] });
      toast.success("Hang frissítve!");
    },
    onError: (error) => {
      toast.error("Hiba a hang frissítésekor: " + error.message);
    },
  });

  // Delete voice
  const deleteVoice = useMutation({
    mutationFn: async (voiceId: string) => {
      const { error } = await supabase
        .from("tts_voices")
        .delete()
        .eq("id", voiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tts-voices"] });
      queryClient.invalidateQueries({ queryKey: ["tts-voices"] });
      toast.success("Hang törölve!");
    },
    onError: (error) => {
      toast.error("Hiba a hang törlésekor: " + error.message);
    },
  });

  // Reorder voices
  const reorderVoices = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from("tts_voices")
          .update({ sort_order: index })
          .eq("id", id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tts-voices"] });
      queryClient.invalidateQueries({ queryKey: ["tts-voices"] });
    },
    onError: (error) => {
      toast.error("Hiba a sorrend mentésekor: " + error.message);
    },
  });

  return {
    voices,
    isLoading,
    createVoice,
    updateVoice,
    deleteVoice,
    reorderVoices,
  };
}
