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
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string;
  subscription_status: string;
  projects_count: number;
  created_at: string;
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
      // Build the query
      let query = supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          avatar_url,
          subscription_tier,
          subscription_status,
          created_at
        `, { count: 'exact' });

      // Apply search filter
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,user_id.eq.${search}`);
      }

      // Apply plan filter
      if (plan !== 'all') {
        query = query.eq('subscription_tier', plan);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data: profiles, error, count } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      // Get project counts for each user
      const userIds = profiles?.map(p => p.user_id) || [];
      
      let projectCounts: Record<string, number> = {};
      if (userIds.length > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('user_id')
          .in('user_id', userIds);
        
        if (projects) {
          projectCounts = projects.reduce((acc, p) => {
            acc[p.user_id] = (acc[p.user_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      }

      // Get auth.users data through admin function (emails)
      // For now, we'll use user_id as a placeholder for email
      const users: AdminUser[] = (profiles || []).map(profile => ({
        id: profile.user_id,
        email: `user-${profile.user_id.slice(0, 8)}@example.com`, // Placeholder
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        subscription_tier: profile.subscription_tier || 'free',
        subscription_status: profile.subscription_status || 'active',
        projects_count: projectCounts[profile.user_id] || 0,
        created_at: profile.created_at,
        last_seen_at: null, // Would need activity tracking
        status: profile.subscription_status === 'active' ? 'active' : 'inactive' as const
      }));

      // Apply status filter client-side (since status is derived)
      const filteredUsers = status === 'all' 
        ? users 
        : users.filter(u => u.status === status);

      return {
        data: filteredUsers,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        page
      };
    },
    staleTime: 30000,
  });
}
