import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  UserSubscription,
  FounderSpots,
  UserUsage,
  SubscriptionTier,
} from "@/types/subscription";

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [founderSpots, setFounderSpots] = useState<FounderSpots | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [activeProjectCount, setActiveProjectCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setUsage(null);
      setActiveProjectCount(0);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch profile with subscription info
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "subscription_tier, subscription_status, is_founder, founder_discount_applied, subscription_start_date, subscription_end_date, monthly_word_limit, project_limit, extra_words_balance"
        )
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      setSubscription({
        tier: (profile.subscription_tier as SubscriptionTier) || "free",
        status: profile.subscription_status as UserSubscription["status"],
        isFounder: profile.is_founder || false,
        founderDiscountApplied: profile.founder_discount_applied || false,
        startDate: profile.subscription_start_date,
        endDate: profile.subscription_end_date,
        monthlyWordLimit: profile.monthly_word_limit || 5000,
        projectLimit: profile.project_limit || 1,
        extraWordsBalance: profile.extra_words_balance || 0,
      });

      // Fetch current month usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: usageData } = await supabase
        .from("user_usage")
        .select("words_generated, projects_created")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .single();

      setUsage({
        wordsGenerated: usageData?.words_generated || 0,
        projectsCreated: usageData?.projects_created || 0,
      });

      // Fetch actual active project count from projects table
      const { count: projectCount, error: projectError } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["active", "draft"]);

      if (projectError) {
        console.error("Error fetching project count:", projectError);
      }

      setActiveProjectCount(projectCount || 0);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchFounderSpots = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("founder_spots")
        .select("total_spots, spots_taken")
        .single();

      if (error) throw error;

      setFounderSpots({
        totalSpots: data.total_spots,
        spotsTaken: data.spots_taken,
      });
    } catch (error) {
      console.error("Error fetching founder spots:", error);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
    fetchFounderSpots();
  }, [fetchSubscription, fetchFounderSpots]);

  const canCreateProject = useCallback(() => {
    if (!subscription) return false;
    if (subscription.projectLimit === -1) return true; // unlimited
    return activeProjectCount < subscription.projectLimit;
  }, [subscription, activeProjectCount]);

  const canGenerateWords = useCallback(
    (wordCount: number) => {
      if (!subscription || !usage) return false;
      if (subscription.monthlyWordLimit === -1) return true; // unlimited
      
      const remainingMonthly = subscription.monthlyWordLimit - usage.wordsGenerated;
      const totalAvailable = remainingMonthly + subscription.extraWordsBalance;
      
      return wordCount <= totalAvailable;
    },
    [subscription, usage]
  );

  const getRemainingWords = useCallback(() => {
    if (!subscription || !usage) return 0;
    if (subscription.monthlyWordLimit === -1) return Infinity;
    const remainingMonthly = Math.max(0, subscription.monthlyWordLimit - usage.wordsGenerated);
    return remainingMonthly + subscription.extraWordsBalance;
  }, [subscription, usage]);

  const isFounderProgramOpen = useCallback(() => {
    if (!founderSpots) return true;
    return founderSpots.spotsTaken < founderSpots.totalSpots;
  }, [founderSpots]);

  const getNextResetDate = useCallback(() => {
    if (!subscription?.startDate) {
      // Free tier: first day of next month
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    // Paid tier: reset on subscription anniversary day
    const startDate = new Date(subscription.startDate);
    const dayOfMonth = startDate.getDate();
    const now = new Date();
    let nextReset = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    if (nextReset <= now) {
      nextReset = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
    }
    return nextReset;
  }, [subscription?.startDate]);

  const isProjectLimitReached = useCallback(() => {
    if (!subscription) return false;
    if (subscription.projectLimit === -1) return false; // unlimited
    return activeProjectCount >= subscription.projectLimit;
  }, [subscription, activeProjectCount]);

  return {
    subscription,
    founderSpots,
    usage,
    activeProjectCount,
    isLoading,
    canCreateProject,
    canGenerateWords,
    getRemainingWords,
    isFounderProgramOpen,
    getNextResetDate,
    isProjectLimitReached,
    refetch: fetchSubscription,
  };
}
