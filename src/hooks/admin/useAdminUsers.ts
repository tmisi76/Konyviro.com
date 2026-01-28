import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseAdminUsersParams {
  search?: string;
  status?: string;
  plan?: string;
  page?: number;
  limit?: number;
}

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_period: string | null;
  projects_count: number;
  created_at: string;
  is_founder: boolean;
  last_seen_at: string | null;
  status: 'active' | 'inactive' | 'banned';
}

interface AdminUsersResponse {
  data: AdminUser[];
  total: number;
  totalPages: number;
  page: number;
}

export function useAdminUsers({
  search = '',
  status = 'all',
  plan = 'all',
  page = 1,
  limit = 20
}: UseAdminUsersParams = {}) {
  return useQuery({
    queryKey: ['admin-users', search, status, plan, page, limit],
    queryFn: async (): Promise<AdminUsersResponse> => {
      // Build URL with query params
      const params = new URLSearchParams({
        search,
        status,
        plan,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await supabase.functions.invoke(`admin-get-users?${params.toString()}`);

      if (response.error) {
        console.error('Error fetching admin users:', response.error);
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
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          billing_period: string | null;
          projects_count: number;
          created_at: string;
          is_founder: boolean;
        }>;
        total: number;
        totalPages: number;
        page: number;
      };

      // Map to expected format with derived status
      const users: AdminUser[] = result.data.map(user => ({
        ...user,
        last_seen_at: null,
        status: user.subscription_status === 'active' ? 'active' : 'inactive' as const,
      }));

      // Apply status filter client-side
      const filteredUsers = status === 'all'
        ? users
        : users.filter(u => u.status === status);

      return {
        data: filteredUsers,
        total: result.total,
        totalPages: result.totalPages,
        page: result.page,
      };
    },
    staleTime: 30000,
  });
}
