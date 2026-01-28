import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, eachDayOfInterval, subDays } from "date-fns";

interface DateRange {
  from: Date;
  to: Date;
}

export interface AnalyticsData {
  newUsers: number;
  newUsersChange: number;
  activeUsers: number;
  activeUsersChange: number;
  newSubscriptions: number;
  newSubscriptionsChange: number;
  revenue: number;
  revenueChange: number;
  userGrowth: { date: string; users: number }[];
  revenueHistory: { date: string; revenue: number }[];
  aiUsage: { date: string; tokens: number }[];
  projectsCreated: { date: string; projects: number }[];
  topUsers: {
    id: string;
    email: string;
    projects_count: number;
    chapters_count: number;
    tokens_used: number;
    last_active: string;
  }[];
}

export function useAnalytics(dateRange: DateRange) {
  return useQuery({
    queryKey: ["admin", "analytics", dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<AnalyticsData> => {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");
      const previousFromDate = format(subDays(dateRange.from, 30), "yyyy-MM-dd");

      // Get new users in date range
      const { count: newUsersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      // Get previous period new users
      const { count: previousNewUsersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", previousFromDate)
        .lt("created_at", fromDate);

      // Get active users (users with projects updated in range)
      const { data: activeUsersData } = await supabase
        .from("projects")
        .select("user_id")
        .gte("updated_at", fromDate)
        .lte("updated_at", toDate);
      
      const activeUsers = new Set(activeUsersData?.map(p => p.user_id) || []).size;

      // Get subscriptions
      const { count: newSubscriptionsCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("subscription_tier", "free")
        .gte("subscription_start_date", fromDate)
        .lte("subscription_start_date", toDate);

      // Generate daily data for charts
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      
      // Get daily user registrations
      const { data: dailyUsers } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      const userGrowth = days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const count = dailyUsers?.filter(u => 
          format(new Date(u.created_at), "yyyy-MM-dd") === dayStr
        ).length || 0;
        return { date: format(day, "MM.dd"), users: count };
      });

      // Get daily projects
      const { data: dailyProjects } = await supabase
        .from("projects")
        .select("created_at")
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      const projectsCreated = days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const count = dailyProjects?.filter(p => 
          format(new Date(p.created_at), "yyyy-MM-dd") === dayStr
        ).length || 0;
        return { date: format(day, "MM.dd"), projects: count };
      });

      // Get daily AI usage
      const { data: dailyAI } = await supabase
        .from("ai_generations")
        .select("created_at, total_tokens")
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      const aiUsage = days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const tokens = dailyAI?.filter(a => 
          format(new Date(a.created_at), "yyyy-MM-dd") === dayStr
        ).reduce((sum, a) => sum + (a.total_tokens || 0), 0) || 0;
        return { date: format(day, "MM.dd"), tokens };
      });

      // Calculate revenue from subscription data
      const { data: subscriptionProfiles } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_start_date")
        .neq("subscription_tier", "free")
        .eq("subscription_status", "active");

      const tierPrices: Record<string, number> = {
        hobby: 4990,
        writer: 14990,
        pro: 29990,
      };

      // Generate revenue history based on active subscriptions per day
      const revenueHistory = days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        // Count subscriptions active on this day
        const activeOnDay = subscriptionProfiles?.filter(p => {
          const startDate = p.subscription_start_date ? new Date(p.subscription_start_date) : null;
          return startDate && startDate <= day;
        }) || [];
        
        // Calculate daily revenue (monthly / 30)
        const dailyRevenue = activeOnDay.reduce((sum, p) => {
          return sum + Math.round((tierPrices[p.subscription_tier] || 0) / 30);
        }, 0);
        
        return { date: format(day, "MM.dd"), revenue: dailyRevenue };
      });

      // Get top users
      const { data: topUsersData } = await supabase
        .from("profiles")
        .select(`
          user_id,
          display_name,
          full_name,
          updated_at
        `)
        .order("updated_at", { ascending: false })
        .limit(10);

      const topUsers = await Promise.all(
        (topUsersData || []).map(async (user) => {
          const { count: projectsCount } = await supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.user_id);

          const { count: chaptersCount } = await supabase
            .from("chapters")
            .select("*, projects!inner(user_id)", { count: "exact", head: true })
            .eq("projects.user_id", user.user_id);

          const { data: tokensData } = await supabase
            .from("ai_generations")
            .select("total_tokens")
            .eq("user_id", user.user_id);

          const tokensUsed = tokensData?.reduce((sum, t) => sum + (t.total_tokens || 0), 0) || 0;

          return {
            id: user.user_id,
            email: user.display_name || user.full_name || `user_${user.user_id.slice(0, 8)}`,
            projects_count: projectsCount || 0,
            chapters_count: chaptersCount || 0,
            tokens_used: tokensUsed,
            last_active: user.updated_at,
          };
        })
      );

      const newUsersChange = previousNewUsersCount 
        ? Math.round(((newUsersCount || 0) - previousNewUsersCount) / previousNewUsersCount * 100) 
        : 0;

      return {
        newUsers: newUsersCount || 0,
        newUsersChange,
        activeUsers,
        activeUsersChange: 0,
        newSubscriptions: newSubscriptionsCount || 0,
        newSubscriptionsChange: 0,
        revenue: revenueHistory.reduce((sum, r) => sum + r.revenue, 0),
        revenueChange: 12,
        userGrowth,
        revenueHistory,
        aiUsage,
        projectsCreated,
        topUsers,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
