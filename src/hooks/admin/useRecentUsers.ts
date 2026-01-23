import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecentUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
}

export function useRecentUsers(limit: number = 5) {
  return useQuery({
    queryKey: ["admin", "recent-users", limit],
    queryFn: async (): Promise<RecentUser[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          full_name,
          avatar_url,
          subscription_tier,
          subscription_status,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // We need to get emails from auth.users, but we can't access it directly
      // So we'll use user_id as a fallback display
      return (data || []).map((profile) => ({
        ...profile,
        email: profile.full_name || `user_${profile.user_id.slice(0, 8)}`,
      }));
    },
    staleTime: 30 * 1000,
  });
}
