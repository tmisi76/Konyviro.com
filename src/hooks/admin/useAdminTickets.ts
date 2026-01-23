import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_email: string;
  assigned_to: string | null;
}

interface UseAdminTicketsOptions {
  status?: string;
  priority?: string;
}

export function useAdminTickets(options: UseAdminTicketsOptions = {}) {
  const { status = "open", priority = "all" } = options;

  return useQuery({
    queryKey: ["admin", "tickets", status, priority],
    queryFn: async (): Promise<AdminTicket[]> => {
      let query = supabase
        .from("support_tickets")
        .select(`
          id,
          subject,
          description,
          status,
          priority,
          category,
          created_at,
          updated_at,
          user_id,
          assigned_to
        `)
        .order("created_at", { ascending: false });

      if (status !== "all") {
        query = query.eq("status", status);
      }

      if (priority !== "all") {
        query = query.eq("priority", priority);
      }

      const { data: tickets, error } = await query;

      if (error) throw error;
      if (!tickets?.length) return [];

      // Get user emails from profiles
      const userIds = [...new Set(tickets.map((t) => t.user_id).filter(Boolean))];
      
      let userEmails: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, full_name")
          .in("user_id", userIds);

        profiles?.forEach((p) => {
          userEmails[p.user_id] = p.display_name || p.full_name || `user_${p.user_id.slice(0, 8)}`;
        });
      }

      return tickets.map((ticket) => ({
        ...ticket,
        user_email: ticket.user_id ? (userEmails[ticket.user_id] || `user_${ticket.user_id.slice(0, 8)}`) : "Névtelen",
      }));
    },
    staleTime: 30 * 1000,
  });
}
