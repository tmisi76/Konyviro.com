import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { REFERRAL_BONUS_WORDS } from "@/constants/referral";

interface ReferralStats {
  referralCode: string | null;
  successfulReferrals: number;
  totalCreditsEarned: number;
  referredBy: string | null;
}

export function useReferral() {
  const { user } = useAuth();

  const { data: referralStats, isLoading, refetch } = useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async (): Promise<ReferralStats> => {
      if (!user?.id) {
        return {
          referralCode: null,
          successfulReferrals: 0,
          totalCreditsEarned: 0,
          referredBy: null
        };
      }

      // Get user's referral code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('referral_code, referred_by')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      // Count successful referrals where this user is the referrer
      const { count, error: countError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .eq('status', 'completed');

      if (countError) {
        console.error('Error counting referrals:', countError);
      }

      const successfulReferrals = count || 0;
      const totalCreditsEarned = successfulReferrals * REFERRAL_BONUS_WORDS;

      return {
        referralCode: profile?.referral_code || null,
        successfulReferrals,
        totalCreditsEarned,
        referredBy: profile?.referred_by || null
      };
    },
    enabled: !!user?.id
  });

  const getReferralLink = () => {
    if (!referralStats?.referralCode) return null;
    
    // Use the production URL
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth?ref=${referralStats.referralCode}`;
  };

  return {
    referralCode: referralStats?.referralCode || null,
    successfulReferrals: referralStats?.successfulReferrals || 0,
    totalCreditsEarned: referralStats?.totalCreditsEarned || 0,
    referredBy: referralStats?.referredBy || null,
    referralLink: getReferralLink(),
    isLoading,
    refetch
  };
}
