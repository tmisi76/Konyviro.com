import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseAdminUsersParams {
  search?: string;
  status?: string;
  plan?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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
  limit = 10,
  sortBy = 'created_at',
  sortOrder = 'desc'
}: UseAdminUsersParams = {}) {
  return useQuery({
    queryKey: ['admin-users', search, status, plan, page, limit, sortBy, sortOrder],
    queryFn: async (): Promise<AdminUsersResponse> => {
      // Build URL with query params
      const params = new URLSearchParams({
        search,
        status,
        plan,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
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

      // Map to expected format - status now comes from backend
      const users: AdminUser[] = result.data.map(user => {
        const backendStatus = (user as any).status;
        const derivedStatus: 'active' | 'inactive' | 'banned' = 
          backendStatus || (user.subscription_status === 'active' ? 'active' : 'inactive');
        
        return {
          ...user,
          last_seen_at: null,
          status: derivedStatus,
        };
      });

      return {
        data: users,
        total: result.total,
        totalPages: result.totalPages,
        page: result.page,
      };
    },
    staleTime: 30000,
  });
}
