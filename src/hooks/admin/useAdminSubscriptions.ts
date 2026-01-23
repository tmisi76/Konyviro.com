import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminSubscription {
  id: string;
  user_id: string;
  user_email: string;
  plan_name: string;
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

      const tierPrices: Record<string, number> = {
        hobby: 4990,
        writer: 14990,
        pro: 29990,
      };

      const tierNames: Record<string, string> = {
        hobby: 'Hobbi',
        writer: 'Író',
        pro: 'Pro',
      };

      return (data || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        user_email: profile.display_name || profile.user_id.substring(0, 8),
        plan_name: tierNames[profile.subscription_tier || ''] || profile.subscription_tier || 'N/A',
        status: (profile.subscription_status as AdminSubscription['status']) || 'active',
        stripe_customer_id: profile.stripe_customer_id,
        stripe_subscription_id: profile.stripe_subscription_id,
        current_period_start: profile.subscription_start_date || profile.created_at,
        current_period_end: profile.subscription_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        amount: tierPrices[profile.subscription_tier || ''] || 0,
      }));
    },
    staleTime: 30000,
  });
}
