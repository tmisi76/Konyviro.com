import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  category: string | null;
  variables: { name: string; description?: string }[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplates(category?: string) {
  return useQuery({
    queryKey: ['email-templates', category],
    queryFn: async (): Promise<EmailTemplate[]> => {
      let query = supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : [],
      })) as EmailTemplate[];
    },
    staleTime: 30000,
  });
}

export function useSaveEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Partial<EmailTemplate> & { name: string; slug: string; subject: string; body_html: string }) => {
      const payload = {
        name: template.name,
        slug: template.slug,
        subject: template.subject,
        body_html: template.body_html,
        body_text: template.body_text || null,
        category: template.category || 'transactional',
        variables: template.variables || [],
        is_active: template.is_active ?? true,
      };

      if (template.id) {
        const { error } = await supabase
          .from('email_templates')
          .update(payload)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert(payload);
        if (error) throw error;
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Sablon törölve!');
    },
  });
}
