import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tierPriceHuf } from "@/lib/aiCostEstimator";

export interface CreditPurchase {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  words_purchased: number;
  amount: number;
}

export interface AudiobookPurchase {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  minutes_purchased: number;
  amount: number;
}

export interface UserRevenue {
  subscriptionTier: string;
  subscriptionStatus: string;
  monthlyPriceHuf: number;
  monthsActive: number;
  subscriptionTotalHuf: number;
  creditPurchases: CreditPurchase[];
  creditPurchasesTotalHuf: number;
  audiobookPurchases: AudiobookPurchase[];
  audiobookPurchasesTotalHuf: number;
  totalRevenueHuf: number;
}

function monthsBetween(start: Date, end: Date): number {
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  return Math.max(1, months + 1);
}

export function useUserRevenue(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-user-revenue", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserRevenue> => {
      const [profileRes, creditRes, audioRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("subscription_tier, subscription_status, subscription_start_date, created_at")
          .eq("user_id", userId!)
          .maybeSingle(),
        supabase
          .from("credit_purchases")
          .select("id, created_at, completed_at, status, words_purchased, amount")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("audiobook_credit_purchases")
          .select("id, created_at, completed_at, status, minutes_purchased, amount")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false }),
      ]);

      const profile = profileRes.data;
      const tier = profile?.subscription_tier || "free";
      const status = profile?.subscription_status || "inactive";
      const monthlyPriceHuf = status === "active" ? tierPriceHuf(tier) : 0;

      let monthsActive = 0;
      if (status === "active" && monthlyPriceHuf > 0) {
        const startStr = profile?.subscription_start_date || profile?.created_at;
        if (startStr) {
          monthsActive = monthsBetween(new Date(startStr), new Date());
        }
      }
      const subscriptionTotalHuf = monthlyPriceHuf * monthsActive;

      const creditPurchases = (creditRes.data || []) as CreditPurchase[];
      const completedCredits = creditPurchases.filter((p) => p.status === "completed");
      // Stripe `amount` is in HUF cents typically (or Ft minor unit). Convert to Ft.
      const creditPurchasesTotalHuf = completedCredits.reduce(
        (sum, p) => sum + Math.round((p.amount || 0) / 100),
        0,
      );

      const audiobookPurchases = (audioRes.data || []) as AudiobookPurchase[];
      const completedAudio = audiobookPurchases.filter((p) => p.status === "completed");
      const audiobookPurchasesTotalHuf = completedAudio.reduce(
        (sum, p) => sum + Math.round((p.amount || 0) / 100),
        0,
      );

      return {
        subscriptionTier: tier,
        subscriptionStatus: status,
        monthlyPriceHuf,
        monthsActive,
        subscriptionTotalHuf,
        creditPurchases,
        creditPurchasesTotalHuf,
        audiobookPurchases,
        audiobookPurchasesTotalHuf,
        totalRevenueHuf:
          subscriptionTotalHuf + creditPurchasesTotalHuf + audiobookPurchasesTotalHuf,
      };
    },
    staleTime: 30_000,
  });
}