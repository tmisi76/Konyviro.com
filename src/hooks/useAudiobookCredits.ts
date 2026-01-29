import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useAudiobookCredits() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch current audiobook minutes balance
  const { data: balance = 0, isLoading } = useQuery({
    queryKey: ["audiobook-credits", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { data, error } = await supabase
        .from("profiles")
        .select("audiobook_minutes_balance")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching audiobook credits:", error);
        return 0;
      }

      return (data as { audiobook_minutes_balance: number })?.audiobook_minutes_balance ?? 0;
    },
    enabled: !!user?.id,
  });

  // Use audiobook minutes
  const useMinutes = useMutation({
    mutationFn: async (minutes: number) => {
      const { data, error } = await supabase.rpc("use_audiobook_minutes", {
        p_minutes: minutes,
      });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (success, minutes) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ["audiobook-credits"] });
      } else {
        toast.error("Nincs elég hangoskönyv kredit");
      }
    },
    onError: (error) => {
      console.error("Error using audiobook minutes:", error);
      toast.error("Hiba a kredit levonásakor");
    },
  });

  // Check if user has enough credits
  const hasEnoughCredits = (requiredMinutes: number): boolean => {
    return balance >= requiredMinutes;
  };

  return {
    balance,
    isLoading,
    useMinutes,
    hasEnoughCredits,
  };
}
