import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReferrerData {
  user_id: string;
  email: string;
  full_name: string | null;
  referral_code: string;
  referrals_count: number;
  total_bonus_given: number;
  suspicious_count: number;
  suspicion_score: number;
  is_banned: boolean;
  referral_banned: boolean;
  created_at: string;
}

export interface ReferralDetail {
  id: string;
  referred_id: string;
  referred_email: string;
  referred_name: string | null;
  ip_address: string | null;
  created_at: string;
  is_fraud: boolean;
  banned_at: string | null;
  suspicion_reasons: string[];
}

export interface AffiliateStats {
  total_referrers: number;
  total_referrals: number;
  total_bonus: number;
  suspicious_count: number;
}

export function useAdminAffiliates() {
  return useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("admin-get-affiliates", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data as { referrers: ReferrerData[]; stats: AffiliateStats };
    },
  });
}

export function useReferrerDetails(referrerId: string | null) {
  return useQuery({
    queryKey: ["admin-referrer-details", referrerId],
    queryFn: async () => {
      if (!referrerId) return null;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("admin-get-affiliates", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: null,
      });

      // Need to call with query param
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-get-affiliates`);
      url.searchParams.set("referrer_id", referrerId);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to fetch referrer details");
      const data = await res.json();
      return data.referrals as ReferralDetail[];
    },
    enabled: !!referrerId,
  });
}

export function useBanReferrer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      referrer_id: string;
      ban_referrer: boolean;
      ban_referred_ids: string[];
      reason: string;
      revoke_bonus?: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("admin-ban-referrer", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: params,
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.banned_count} felhasználó letiltva`);
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
    },
    onError: (error) => {
      toast.error(`Hiba: ${error.message}`);
    },
  });
}
