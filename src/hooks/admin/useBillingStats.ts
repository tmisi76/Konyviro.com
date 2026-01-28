import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BillingStats {
  mrr: number;
  mrrChange: number;
  activeSubscriptions: number;
  newThisMonth: number;
  churnRate: number;
  planDistribution: { name: string; count: number; percentage: number; color: string }[];
  revenueHistory: { month: string; revenue: number }[];
}

export function useBillingStats() {
  return useQuery({
    queryKey: ['billing-stats'],
    queryFn: async (): Promise<BillingStats> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Get active subscriptions count
      const { data: activeProfiles, error: activeError } = await supabase
        .from('profiles')
        .select('subscription_tier, created_at')
        .neq('subscription_tier', 'free')
        .eq('subscription_status', 'active');

      if (activeError) throw activeError;

      // Get new subscriptions this month
      const newThisMonth = activeProfiles?.filter(
        p => new Date(p.created_at) >= startOfMonth
      ).length || 0;

      // Calculate plan distribution
      const tierCounts: Record<string, number> = {};
      const tierColors: Record<string, string> = {
        hobby: '#3b82f6',
        writer: '#8b5cf6',
        pro: '#f59e0b',
        free: '#6b7280',
      };

      activeProfiles?.forEach(p => {
        const tier = p.subscription_tier || 'free';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      });

      const total = activeProfiles?.length || 1;
      const planDistribution = Object.entries(tierCounts).map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
        percentage: Math.round((count / total) * 100),
        color: tierColors[name] || '#6b7280',
      }));

      // Calculate MRR (simplified estimate)
      const tierPrices: Record<string, number> = {
        hobby: 4990,
        writer: 14990,
        pro: 29990,
      };

      const mrr = activeProfiles?.reduce((sum, p) => {
        return sum + (tierPrices[p.subscription_tier || ''] || 0);
      }, 0) || 0;

      // Get last month's subscriptions for comparison
      const { data: lastMonthProfiles } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .neq('subscription_tier', 'free')
        .eq('subscription_status', 'active')
        .lt('created_at', startOfMonth.toISOString())
        .gte('created_at', lastMonth.toISOString());

      const lastMonthMrr = lastMonthProfiles?.reduce((sum, p) => {
        return sum + (tierPrices[p.subscription_tier || ''] || 0);
      }, 0) || 0;

      // Calculate MRR change percentage
      const mrrChange = lastMonthMrr > 0 
        ? Math.round(((mrr - lastMonthMrr) / lastMonthMrr) * 100 * 10) / 10
        : 0;

      // Get cancelled subscriptions for churn rate
      const { count: cancelledCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'cancelled')
        .gte('updated_at', lastMonth.toISOString())
        .lt('updated_at', startOfMonth.toISOString());

      const totalLastMonth = lastMonthProfiles?.length || 1;
      const churnRate = Math.round(((cancelledCount || 0) / totalLastMonth) * 100 * 10) / 10;

      // Generate revenue history from actual data
      const revenueHistory = await Promise.all(
        Array.from({ length: 6 }, async (_, i) => {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
          const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1);
          
          const { data: monthProfiles } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .neq('subscription_tier', 'free')
            .eq('subscription_status', 'active')
            .lt('created_at', nextMonthDate.toISOString());

          const monthRevenue = monthProfiles?.reduce((sum, p) => {
            return sum + (tierPrices[p.subscription_tier || ''] || 0);
          }, 0) || 0;

          return {
            month: monthDate.toLocaleDateString('hu-HU', { month: 'short' }),
            revenue: monthRevenue,
          };
        })
      );

      return {
        mrr,
        mrrChange,
        activeSubscriptions: activeProfiles?.length || 0,
        newThisMonth,
        churnRate,
        planDistribution,
        revenueHistory,
      };
    },
    staleTime: 60000,
  });
}
