import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIUsageStats {
  todayTokens: number;
  todayCost: number;
  todayGenerations: number;
  avgTokensPerChapter: number;
  weeklyTokens: number;
  monthlyTokens: number;
  modelBreakdown: { model: string; tokens: number; count: number }[];
}

export function useAIUsageStats() {
  return useQuery({
    queryKey: ['ai-usage-stats'],
    queryFn: async (): Promise<AIUsageStats> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      // Fetch today's generations
      const { data: todayData } = await supabase
        .from('ai_generations')
        .select('total_tokens, model')
        .gte('created_at', today.toISOString());

      // Fetch weekly generations
      const { data: weeklyData } = await supabase
        .from('ai_generations')
        .select('total_tokens')
        .gte('created_at', weekAgo.toISOString());

      // Fetch monthly generations
      const { data: monthlyData } = await supabase
        .from('ai_generations')
        .select('total_tokens')
        .gte('created_at', monthAgo.toISOString());

      // Calculate stats
      const todayTokens = todayData?.reduce((sum, g) => sum + (g.total_tokens || 0), 0) || 0;
      const todayGenerations = todayData?.length || 0;
      const weeklyTokens = weeklyData?.reduce((sum, g) => sum + (g.total_tokens || 0), 0) || 0;
      const monthlyTokens = monthlyData?.reduce((sum, g) => sum + (g.total_tokens || 0), 0) || 0;

      // Estimate cost (rough average $0.002 per 1K tokens)
      const todayCost = (todayTokens / 1000) * 0.002;

      // Average tokens per generation
      const avgTokensPerChapter = todayGenerations > 0 
        ? Math.round(todayTokens / todayGenerations) 
        : 0;

      // Model breakdown
      const modelBreakdown: { model: string; tokens: number; count: number }[] = [];
      if (todayData) {
        const modelMap = new Map<string, { tokens: number; count: number }>();
        todayData.forEach(g => {
          const model = g.model || 'unknown';
          const existing = modelMap.get(model) || { tokens: 0, count: 0 };
          modelMap.set(model, {
            tokens: existing.tokens + (g.total_tokens || 0),
            count: existing.count + 1,
          });
        });
        modelMap.forEach((value, key) => {
          modelBreakdown.push({ model: key, ...value });
        });
      }

      return {
        todayTokens,
        todayCost,
        todayGenerations,
        avgTokensPerChapter,
        weeklyTokens,
        monthlyTokens,
        modelBreakdown,
      };
    },
    staleTime: 30000,
  });
}
