import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Tier prices for revenue calculation
const TIER_PRICES: Record<string, number> = {
  hobby: 4990,
  writer: 14990,
  pro: 29990,
};

const DISCOUNT_PERCENT = 30;
const DISCOUNT_DURATION_MONTHS = 3;

export interface RetentionStats {
  offersShown: number;
  offersAccepted: number;
  acceptanceRate: number;
  activeDiscounts: number;
  estimatedRevenueSaved: number;
  averageSavingsPerUser: number;
}

export function useRetentionStats() {
  return useQuery({
    queryKey: ["admin", "retention-stats"],
    queryFn: async (): Promise<RetentionStats> => {
      // Get all profiles with retention data
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("subscription_tier, retention_offer_shown_at, retention_offer_accepted_at, retention_discount_active, retention_discount_expires_at")
        .not("retention_offer_shown_at", "is", null);

      if (error) throw error;

      const offersShown = profiles?.length || 0;
      const offersAccepted = profiles?.filter(p => p.retention_offer_accepted_at)?.length || 0;
      const activeDiscounts = profiles?.filter(p => p.retention_discount_active)?.length || 0;
      const acceptanceRate = offersShown > 0 ? Math.round((offersAccepted / offersShown) * 100) : 0;

      // Calculate estimated revenue saved
      // For each accepted offer, user pays 70% for 3 months instead of leaving
      // Revenue saved = (full price * 3 months) * 70% = what we get instead of $0
      let estimatedRevenueSaved = 0;
      
      const acceptedProfiles = profiles?.filter(p => p.retention_offer_accepted_at) || [];
      for (const profile of acceptedProfiles) {
        const tierPrice = TIER_PRICES[profile.subscription_tier] || 0;
        // Revenue saved = discounted price * duration (what we earn instead of churn)
        const discountedPrice = tierPrice * (1 - DISCOUNT_PERCENT / 100);
        estimatedRevenueSaved += discountedPrice * DISCOUNT_DURATION_MONTHS;
      }

      const averageSavingsPerUser = offersAccepted > 0 
        ? Math.round(estimatedRevenueSaved / offersAccepted) 
        : 0;

      return {
        offersShown,
        offersAccepted,
        acceptanceRate,
        activeDiscounts,
        estimatedRevenueSaved: Math.round(estimatedRevenueSaved),
        averageSavingsPerUser,
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
