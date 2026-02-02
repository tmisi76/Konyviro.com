import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BillingStats {
  mrr: number;
  mrrChange: number;
  monthlyMRR: number;
  yearlyRevenue: number;
  yearlyCount: number;
  monthlyCount: number;
  activeSubscriptions: number;
  newThisMonth: number;
  churnRate: number;
  planDistribution: { name: string; count: number; percentage: number; color: string; period: string }[];
  revenueHistory: { month: string; revenue: number }[];
}

export function useBillingStats() {
  return useQuery({
    queryKey: ['billing-stats'],
    queryFn: async (): Promise<BillingStats> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Get active subscriptions count with billing_period
      const { data: activeProfiles, error: activeError } = await supabase
        .from('profiles')
        .select('subscription_tier, billing_period, created_at, full_name, display_name')
        .neq('subscription_tier', 'free')
        .eq('subscription_status', 'active');

      if (activeError) throw activeError;

      // Get new subscriptions this month
      const newThisMonth = activeProfiles?.filter(
        p => new Date(p.created_at) >= startOfMonth
      ).length || 0;

      // Separate by billing period
      const monthlyProfiles = activeProfiles?.filter(p => p.billing_period === 'monthly') || [];
      const yearlyProfiles = activeProfiles?.filter(p => p.billing_period === 'yearly' || !p.billing_period) || [];

      // Monthly prices
      const monthlyPrices: Record<string, number> = {
        hobby: 4990,
        writer: 14990,
        pro: 29990,
      };

      // Yearly prices (total yearly amount)
      const yearlyPrices: Record<string, number> = {
        hobby: 29940,
        writer: 89940,
        pro: 179940,
      };

      // Calculate Monthly MRR (only monthly subscribers)
      const monthlyMRR = monthlyProfiles.reduce((sum, p) => {
        return sum + (monthlyPrices[p.subscription_tier || ''] || 0);
      }, 0);

      // Calculate yearly revenue (actual yearly amounts)
      const yearlyRevenue = yearlyProfiles.reduce((sum, p) => {
        return sum + (yearlyPrices[p.subscription_tier || ''] || 0);
      }, 0);

      // Counts
      const monthlyCount = monthlyProfiles.length;
      const yearlyCount = yearlyProfiles.length;

      // For total MRR display: monthly + yearly equivalent
      const yearlyMonthlyEquivalent = yearlyProfiles.reduce((sum, p) => {
        const yearlyPrice = yearlyPrices[p.subscription_tier || ''] || 0;
        return sum + Math.round(yearlyPrice / 12);
      }, 0);
      const mrr = monthlyMRR + yearlyMonthlyEquivalent;

      // Calculate plan distribution with period info
      const tierCounts: Record<string, { monthly: number; yearly: number }> = {
        hobby: { monthly: 0, yearly: 0 },
        writer: { monthly: 0, yearly: 0 },
        pro: { monthly: 0, yearly: 0 },
      };

      const tierColors: Record<string, string> = {
        hobby: '#3b82f6',
        writer: '#8b5cf6',
        pro: '#f59e0b',
      };

      activeProfiles?.forEach(p => {
        const tier = p.subscription_tier || 'free';
        if (tierCounts[tier]) {
          if (p.billing_period === 'monthly') {
            tierCounts[tier].monthly++;
          } else {
            tierCounts[tier].yearly++;
          }
        }
      });

      const total = activeProfiles?.length || 1;
      const planDistribution = Object.entries(tierCounts).flatMap(([name, counts]) => {
        const results = [];
        if (counts.monthly > 0) {
          results.push({
            name: `${name.charAt(0).toUpperCase() + name.slice(1)} (havi)`,
            count: counts.monthly,
            percentage: Math.round((counts.monthly / total) * 100),
            color: tierColors[name] || '#6b7280',
            period: 'monthly',
          });
        }
        if (counts.yearly > 0) {
          results.push({
            name: `${name.charAt(0).toUpperCase() + name.slice(1)} (éves)`,
            count: counts.yearly,
            percentage: Math.round((counts.yearly / total) * 100),
            color: tierColors[name] + '99', // Slightly transparent for yearly
            period: 'yearly',
          });
        }
        return results;
      });

      // Get last month's subscriptions for comparison
      const { data: lastMonthProfiles } = await supabase
        .from('profiles')
        .select('subscription_tier, billing_period')
        .neq('subscription_tier', 'free')
        .eq('subscription_status', 'active')
        .lt('created_at', startOfMonth.toISOString())
        .gte('created_at', lastMonth.toISOString());

      const lastMonthMrr = lastMonthProfiles?.reduce((sum, p) => {
        const isYearly = p.billing_period === 'yearly' || !p.billing_period;
        if (isYearly) {
          const yearlyPrice = yearlyPrices[p.subscription_tier || ''] || 0;
          return sum + Math.round(yearlyPrice / 12);
        }
        return sum + (monthlyPrices[p.subscription_tier || ''] || 0);
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
            .select('subscription_tier, billing_period')
            .neq('subscription_tier', 'free')
            .eq('subscription_status', 'active')
            .lt('created_at', nextMonthDate.toISOString());

          const monthRevenue = monthProfiles?.reduce((sum, p) => {
            const isYearly = p.billing_period === 'yearly' || !p.billing_period;
            if (isYearly) {
              const yearlyPrice = yearlyPrices[p.subscription_tier || ''] || 0;
              return sum + Math.round(yearlyPrice / 12);
            }
            return sum + (monthlyPrices[p.subscription_tier || ''] || 0);
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
        monthlyMRR,
        yearlyRevenue,
        yearlyCount,
        monthlyCount,
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
