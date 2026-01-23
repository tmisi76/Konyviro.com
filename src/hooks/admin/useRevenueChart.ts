import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, eachDayOfInterval, startOfDay } from "date-fns";

export interface ChartDataPoint {
  date: string;
  revenue: number;
  users: number;
  projects: number;
}

export function useRevenueChart(days: number = 30) {
  return useQuery({
    queryKey: ["admin", "revenue-chart", days],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      // Get analytics data if available
      const { data: analyticsData } = await supabase
        .from("analytics_daily")
        .select("date, revenue_total, new_users, projects_created")
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"))
        .order("date", { ascending: true });

      // Get daily signups
      const { data: profiles } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", startDate.toISOString());

      // Get daily projects
      const { data: projects } = await supabase
        .from("projects")
        .select("created_at")
        .gte("created_at", startDate.toISOString());

      // Create a map of dates
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      
      const signupsByDate: Record<string, number> = {};
      const projectsByDate: Record<string, number> = {};
      const analyticsMap: Record<string, { revenue: number; users: number; projects: number }> = {};

      // Map analytics data
      analyticsData?.forEach((a) => {
        analyticsMap[a.date] = {
          revenue: a.revenue_total || 0,
          users: a.new_users || 0,
          projects: a.projects_created || 0,
        };
      });

      // Count signups per day
      profiles?.forEach((p) => {
        const date = format(new Date(p.created_at), "yyyy-MM-dd");
        signupsByDate[date] = (signupsByDate[date] || 0) + 1;
      });

      // Count projects per day
      projects?.forEach((p) => {
        const date = format(new Date(p.created_at), "yyyy-MM-dd");
        projectsByDate[date] = (projectsByDate[date] || 0) + 1;
      });

      return dateRange.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const analytics = analyticsMap[dateStr];
        
        return {
          date: format(date, "MM/dd"),
          revenue: analytics?.revenue || 0,
          users: analytics?.users || signupsByDate[dateStr] || 0,
          projects: analytics?.projects || projectsByDate[dateStr] || 0,
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
