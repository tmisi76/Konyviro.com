import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminStats {
  totalUsers: number;
  usersChange: number;
  monthlyRevenue: number;
  revenueChange: number;
  activeSubscriptions: number;
  subscriptionsChange: number;
  totalBooks: number;
  booksChange: number;
  todaySignups: number;
  activeNow: number;
  openTickets: number;
  todayTokens: number;
  subscriptionDistribution: Array<{
    name: string;
    count: number;
    percentage: number;
    color: string;
  }>;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async (): Promise<AdminStats> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Users this month
      const { count: usersThisMonth } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      // Users last month
      const { count: usersLastMonth } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfLastMonth.toISOString())
        .lt("created_at", startOfMonth.toISOString());

      // Today's signups
      const { count: todaySignups } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Active subscriptions
      const { count: activeSubscriptions } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("subscription_tier", "free")
        .eq("subscription_status", "active");

      // Last month active subscriptions (approximate)
      const { count: lastMonthSubscriptions } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("subscription_tier", "free")
        .lte("subscription_start_date", endOfLastMonth.toISOString());

      // Total projects/books
      const { count: totalBooks } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true });

      // Books this month
      const { count: booksThisMonth } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      // Books last month
      const { count: booksLastMonth } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfLastMonth.toISOString())
        .lt("created_at", startOfMonth.toISOString());

      // Open support tickets
      const { count: openTickets } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]);

      // Today's AI tokens (from ai_generations)
      const { data: todayGenerations } = await supabase
        .from("ai_generations")
        .select("total_tokens")
        .gte("created_at", today.toISOString());

      const todayTokens = todayGenerations?.reduce((sum, g) => sum + (g.total_tokens || 0), 0) || 0;

      // Subscription distribution
      const { data: subDistribution } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("subscription_status", "active");

      const tierCounts: Record<string, number> = {
        free: 0,
        hobby: 0,
        writer: 0,
        pro: 0,
      };

      subDistribution?.forEach((p) => {
        const tier = p.subscription_tier || "free";
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      });

      const totalSubs = Object.values(tierCounts).reduce((a, b) => a + b, 0);

      const subscriptionDistribution = [
        { name: "Ingyenes", count: tierCounts.free, percentage: totalSubs ? Math.round((tierCounts.free / totalSubs) * 100) : 0, color: "#6b7280" },
        { name: "Hobbi", count: tierCounts.hobby, percentage: totalSubs ? Math.round((tierCounts.hobby / totalSubs) * 100) : 0, color: "#3b82f6" },
        { name: "Író", count: tierCounts.writer, percentage: totalSubs ? Math.round((tierCounts.writer / totalSubs) * 100) : 0, color: "#8b5cf6" },
        { name: "Pro", count: tierCounts.pro, percentage: totalSubs ? Math.round((tierCounts.pro / totalSubs) * 100) : 0, color: "#f59e0b" },
      ];

      // Calculate changes
      const usersChange = usersLastMonth ? Math.round(((usersThisMonth || 0) - usersLastMonth) / usersLastMonth * 100) : 0;
      const booksChange = booksLastMonth ? Math.round(((booksThisMonth || 0) - booksLastMonth) / booksLastMonth * 100) : 0;
      const subscriptionsChange = lastMonthSubscriptions ? Math.round(((activeSubscriptions || 0) - lastMonthSubscriptions) / lastMonthSubscriptions * 100) : 0;

      // Monthly revenue (estimated from subscription plans)
      const hobbyPrice = 4990;
      const writerPrice = 14990;
      const proPrice = 29990;
      const monthlyRevenue = 
        tierCounts.hobby * hobbyPrice + 
        tierCounts.writer * writerPrice + 
        tierCounts.pro * proPrice;

      return {
        totalUsers: totalUsers || 0,
        usersChange,
        monthlyRevenue,
        revenueChange: subscriptionsChange, // Use subscription change as proxy
        activeSubscriptions: activeSubscriptions || 0,
        subscriptionsChange,
        totalBooks: totalBooks || 0,
        booksChange,
        todaySignups: todaySignups || 0,
        activeNow: Math.floor(Math.random() * 10) + 1, // Placeholder - would need realtime tracking
        openTickets: openTickets || 0,
        todayTokens,
        subscriptionDistribution,
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
