import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface DateRange {
  from: Date;
  to: Date;
}

interface ActivityLogsFilter {
  action: string;
  admin: string;
  dateRange: DateRange;
}

export interface ActivityLog {
  id: string;
  admin_user_id: string | null;
  admin_email: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
}

export function useActivityLogs(filter: ActivityLogsFilter) {
  return useQuery({
    queryKey: ["admin", "activity-logs", filter],
    queryFn: async (): Promise<ActivityLog[]> => {
      const fromDate = format(filter.dateRange.from, "yyyy-MM-dd");
      const toDate = format(filter.dateRange.to, "yyyy-MM-dd'T'23:59:59");

      let query = supabase
        .from("admin_activity_logs")
        .select("*")
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter.action !== "all") {
        query = query.eq("action", filter.action);
      }

      if (filter.admin !== "all") {
        query = query.eq("admin_user_id", filter.admin);
      }

      const { data: logs, error } = await query;

      if (error) throw error;
      if (!logs?.length) return [];

      // Get admin emails
      const adminIds = [...new Set(logs.map(l => l.admin_user_id).filter(Boolean))];
      
      let adminEmails: Record<string, string> = {};
      if (adminIds.length > 0) {
        const { data: adminUsers } = await supabase
          .from("admin_users")
          .select("user_id")
          .in("user_id", adminIds as string[]);

        if (adminUsers?.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, full_name")
            .in("user_id", adminUsers.map(a => a.user_id));

          profiles?.forEach((p) => {
            adminEmails[p.user_id] = p.display_name || p.full_name || `admin_${p.user_id.slice(0, 8)}`;
          });
        }
      }

      return logs.map((log) => ({
        ...log,
        details: log.details as Record<string, unknown> | null,
        admin_email: log.admin_user_id 
          ? (adminEmails[log.admin_user_id] || `admin_${log.admin_user_id.slice(0, 8)}`) 
          : "Rendszer",
      }));
    },
    staleTime: 30 * 1000,
  });
}

export function useLogActivity() {
  return async (action: string, entityType?: string, entityId?: string, details?: Record<string, unknown>) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Use type assertion to handle JSON type conversion
    const insertData: {
      admin_user_id: string | undefined;
      action: string;
      entity_type?: string;
      entity_id?: string;
      details?: Record<string, unknown>;
    } = {
      admin_user_id: user?.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    };
    
    await supabase.from("admin_activity_logs").insert(insertData as any);
  };
}
