import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { aggregateCosts, type CostAggregate } from "@/lib/aiCostEstimator";

export interface UserGeneration {
  id: string;
  created_at: string;
  model: string;
  action_type: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  project_id: string | null;
  chapter_id: string | null;
}

export interface UserAIUsage {
  generations: UserGeneration[];
  aggregate: CostAggregate;
}

export function useUserAIUsage(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-user-ai-usage", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserAIUsage> => {
      const { data, error } = await supabase
        .from("ai_generations")
        .select("id, created_at, model, action_type, prompt_tokens, completion_tokens, total_tokens, project_id, chapter_id")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const generations = (data || []) as UserGeneration[];
      return {
        generations,
        aggregate: aggregateCosts(generations),
      };
    },
    staleTime: 30_000,
  });
}