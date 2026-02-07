import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface EmailCampaign {
  id: string;
  admin_id: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  recipient_type: string;
  recipient_filter: Record<string, unknown>;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  scheduled_at: string | null;
}

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ["admin", "email-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_email_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmailCampaign[];
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: {
      subject: string;
      body_html: string;
      body_text?: string;
      recipient_type: string;
      recipient_filter?: Record<string, unknown>;
      recipient_count: number;
      scheduled_at?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const isScheduled = !!campaign.scheduled_at;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from("admin_email_campaigns") as any)
        .insert([{
          admin_id: user.id,
          subject: campaign.subject,
          body_html: campaign.body_html,
          body_text: campaign.body_text || null,
          recipient_type: campaign.recipient_type,
          recipient_filter: campaign.recipient_filter || {},
          recipient_count: campaign.recipient_count,
          status: isScheduled ? "scheduled" : "draft",
          scheduled_at: campaign.scheduled_at || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "email-campaigns"] });
    },
  });
}

export function useSendCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke("send-campaign-email", {
        body: { campaignId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "email-campaigns"] });
      toast({
        title: "Kampány elindítva",
        description: "Az emailek küldése megkezdődött.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCountRecipients() {
  return useMutation({
    mutationFn: async (params: {
      recipient_type: string;
      filter_value?: string;
      inactive_days?: number;
    }) => {
      const { data, error } = await supabase.rpc("count_campaign_recipients", {
        p_recipient_type: params.recipient_type,
        p_filter_value: params.filter_value || null,
        p_inactive_days: params.inactive_days || null,
      });

      if (error) throw error;
      return data as number;
    },
  });
}

export function useCancelCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("admin_email_campaigns")
        .update({ status: "cancelled" })
        .eq("id", campaignId)
        .eq("status", "scheduled");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "email-campaigns"] });
      toast({
        title: "Ütemezés törölve",
        description: "A kampány ütemezése sikeresen törölve.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
