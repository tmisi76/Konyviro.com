import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OpenTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  created_at: string;
  user_id: string;
  user_name: string | null;
}

export function useOpenTickets(limit: number = 5) {
  return useQuery({
    queryKey: ["admin", "open-tickets", limit],
    queryFn: async (): Promise<OpenTicket[]> => {
      const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select(`
          id,
          subject,
          status,
          priority,
          category,
          created_at,
          user_id
        `)
        .in("status", ["open", "in_progress", "waiting_for_customer"])
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!tickets?.length) return [];

      // Get user names
      const userIds = [...new Set(tickets.map((t) => t.user_id).filter(Boolean))];
      
      let userNames: Record<string, string | null> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        profiles?.forEach((p) => {
          userNames[p.user_id] = p.full_name;
        });
      }

      return tickets.map((ticket) => ({
        ...ticket,
        user_name: ticket.user_id ? (userNames[ticket.user_id] || `user_${ticket.user_id.slice(0, 8)}`) : "Névtelen",
      }));
    },
    staleTime: 30 * 1000,
  });
}
