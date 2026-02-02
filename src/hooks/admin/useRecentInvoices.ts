import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Invoice {
  id: string;
  customer_email: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  plan_name: string;
  created_at: string;
}

export function useRecentInvoices(limit: number = 10) {
  return useQuery({
    queryKey: ['recent-invoices', limit],
    queryFn: async (): Promise<Invoice[]> => {
      // Get recent subscription changes as proxy for invoices
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, user_id, subscription_tier, billing_period, subscription_status, created_at, updated_at')
        .neq('subscription_tier', 'free')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Monthly prices
      const monthlyPrices: Record<string, number> = {
        hobby: 4990,
        writer: 14990,
        pro: 29990,
      };

      // Yearly prices
      const yearlyPrices: Record<string, number> = {
        hobby: 29940,
        writer: 89940,
        pro: 179940,
      };

      const tierNames: Record<string, string> = {
        hobby: 'Hobbi',
        writer: 'Profi',
        pro: 'Pro',
      };

      return (data || []).map(profile => {
        const billingPeriod = profile.billing_period || 'yearly';
        const prices = billingPeriod === 'yearly' ? yearlyPrices : monthlyPrices;
        const periodSuffix = billingPeriod === 'yearly' ? ' (éves)' : ' (havi)';
        
        return {
          id: profile.id,
          customer_email: profile.full_name || profile.display_name || `user_${profile.user_id.substring(0, 8)}`,
          amount: prices[profile.subscription_tier || ''] || 0,
          status: profile.subscription_status === 'active' ? 'paid' : 
                  profile.subscription_status === 'past_due' ? 'pending' : 'failed',
          plan_name: (tierNames[profile.subscription_tier || ''] || profile.subscription_tier || 'N/A') + periodSuffix,
          created_at: profile.updated_at || profile.created_at,
        };
      });
    },
    staleTime: 30000,
  });
}
