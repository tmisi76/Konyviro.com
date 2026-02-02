import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminSubscription {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  plan_name: string;
  billing_period: 'monthly' | 'yearly';
  status: 'active' | 'past_due' | 'trialing' | 'cancelled';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  amount: number;
}

export function useAdminSubscriptions() {
  return useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async (): Promise<AdminSubscription[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('subscription_tier', 'free')
        .order('created_at', { ascending: false });

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
        const billingPeriod = (profile.billing_period as 'monthly' | 'yearly') || 'yearly';
        const prices = billingPeriod === 'yearly' ? yearlyPrices : monthlyPrices;
        
        return {
          id: profile.id,
          user_id: profile.user_id,
          user_email: profile.full_name || profile.display_name || profile.user_id.substring(0, 8),
          user_name: profile.full_name || profile.display_name || '',
          plan_name: tierNames[profile.subscription_tier || ''] || profile.subscription_tier || 'N/A',
          billing_period: billingPeriod,
          status: (profile.subscription_status as AdminSubscription['status']) || 'active',
          stripe_customer_id: profile.stripe_customer_id,
          stripe_subscription_id: profile.stripe_subscription_id,
          current_period_start: profile.subscription_start_date || profile.created_at,
          current_period_end: profile.subscription_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
          amount: prices[profile.subscription_tier || ''] || 0,
        };
      });
    },
    staleTime: 30000,
  });
}
