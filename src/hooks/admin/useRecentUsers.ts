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
      const params = new URLSearchParams({
        page: "1",
        limit: limit.toString(),
      });

      const response = await supabase.functions.invoke(`admin-get-users?${params.toString()}`);

      if (response.error) {
        console.error('Error fetching recent users:', response.error);
        throw new Error(response.error.message || 'Failed to fetch users');
      }

      const result = response.data as {
        data: Array<{
          id: string;
          user_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          subscription_tier: string;
          subscription_status: string;
          created_at: string;
        }>;
      };

      return result.data.map(user => ({
        id: user.id,
        user_id: user.user_id,
        email: user.email || user.full_name || `user_${user.user_id.slice(0, 8)}`,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        created_at: user.created_at,
      }));
    },
    staleTime: 30 * 1000,
  });
}
