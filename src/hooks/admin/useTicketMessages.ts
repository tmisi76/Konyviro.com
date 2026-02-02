import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  is_admin_reply: boolean;
  sender_id: string | null;
  sender_email: string;
  created_at: string;
  attachments: unknown;
}

export function useTicketMessages(ticketId: string) {
  return useQuery({
    queryKey: ["admin", "ticket-messages", ticketId],
    queryFn: async (): Promise<TicketMessage[]> => {
      if (!ticketId) return [];

      const { data: messages, error } = await supabase
        .from("support_ticket_messages")
        .select(`
          id,
          ticket_id,
          message,
          is_admin_reply,
          sender_id,
          created_at,
          attachments
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!messages?.length) return [];

      // Get sender emails
      const senderIds = [...new Set(messages.map((m) => m.sender_id).filter(Boolean))];
      
      let senderEmails: Record<string, string> = {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, full_name")
          .in("user_id", senderIds as string[]);

        profiles?.forEach((p) => {
          senderEmails[p.user_id] = p.display_name || p.full_name || `user_${p.user_id.slice(0, 8)}`;
        });
      }

      return messages.map((msg) => ({
        ...msg,
        sender_email: msg.sender_id ? (senderEmails[msg.sender_id] || `user_${msg.sender_id.slice(0, 8)}`) : "Névtelen",
      }));
    },
    enabled: !!ticketId,
    staleTime: 10 * 1000,
  });
}

export function useSendTicketReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, message, recipientEmail, ticketSubject }: { 
      ticketId: string; 
      message: string; 
      recipientEmail?: string;
      ticketSubject?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { error } = await supabase
        .from("support_ticket_messages")
        .insert({
          ticket_id: ticketId,
          message,
          is_admin_reply: true,
          sender_id: user.id,
        });

      if (error) throw error;

      // Update ticket status to waiting_for_customer
      await supabase
        .from("support_tickets")
        .update({ 
          status: "waiting_for_customer",
          updated_at: new Date().toISOString()
        })
        .eq("id", ticketId);

      // Send email notification to user
      if (recipientEmail) {
        try {
          await supabase.functions.invoke("send-ticket-reply-email", {
            body: { 
              ticketId, 
              message, 
              recipientEmail,
              ticketSubject: ticketSubject || "Support kérés"
            },
          });
        } catch (emailError) {
          console.error("Failed to send ticket reply email:", emailError);
          // Don't throw - the reply was saved, email is secondary
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket-messages", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (status === "resolved" || status === "closed") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
  });
}

export function useUpdateTicketPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, priority }: { ticketId: string; priority: string }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ 
          priority,
          updated_at: new Date().toISOString()
        })
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
  });
}
