import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/types/subscription";

export interface AdminPlan extends SubscriptionPlan {
  is_active: boolean;
  stripe_price_id: string | null;
  price_monthly: number;
  price_yearly: number;
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async (): Promise<AdminPlan[]> => {
      // Convert SUBSCRIPTION_PLANS to AdminPlan format
      return SUBSCRIPTION_PLANS.map(plan => ({
        ...plan,
        is_active: !plan.isHidden,
        stripe_price_id: plan.monthlyPriceId || null,
        price_monthly: parseInt(plan.monthlyPrice.replace(/[^\d]/g, '')) || 0,
        price_yearly: parseInt(plan.yearlyPrice.replace(/[^\d]/g, '')) || 0,
      }));
    },
    staleTime: 60000,
  });
}

export function useTogglePlanActive() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (planId: string) => {
      // In a real app, this would update the database
      console.log('Toggling plan active status:', planId);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
  });
}
