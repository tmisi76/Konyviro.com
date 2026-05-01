import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { aggregateCosts, type CostAggregate } from "@/lib/aiCostEstimator";

export interface ProjectGeneration {
  id: string;
  created_at: string;
  model: string;
  action_type: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  chapter_id: string | null;
}

export interface ProjectAIUsage {
  generations: ProjectGeneration[];
  aggregate: CostAggregate;
}

export function useProjectAIUsage(projectId: string | undefined) {
  return useQuery({
    queryKey: ["admin-project-ai-usage", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectAIUsage> => {
      const { data, error } = await supabase
        .from("ai_generations")
        .select("id, created_at, model, action_type, prompt_tokens, completion_tokens, total_tokens, chapter_id")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const generations = (data || []) as ProjectGeneration[];
      return {
        generations,
        aggregate: aggregateCosts(generations),
      };
    },
    staleTime: 30_000,
  });
}