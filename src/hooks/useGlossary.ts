import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GlossaryTerm {
  id: string;
  project_id: string;
  term: string;
  definition: string;
  category: string | null;
  aliases: string[];
  created_at: string;
  updated_at: string;
}

export function useGlossary(projectId: string) {
  const queryClient = useQueryClient();

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ["glossary", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glossary_terms")
        .select("*")
        .eq("project_id", projectId)
        .order("term");
      if (error) throw error;
      return data as GlossaryTerm[];
    },
    enabled: !!projectId,
  });

  const createTerm = useMutation({
    mutationFn: async (term: Omit<GlossaryTerm, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("glossary_terms")
        .insert(term)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["glossary", projectId] });
      toast.success("Szószedet bejegyzés hozzáadva!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTerm = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GlossaryTerm> & { id: string }) => {
      const { error } = await supabase
        .from("glossary_terms")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["glossary", projectId] });
    },
  });

  const deleteTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("glossary_terms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["glossary", projectId] });
      toast.success("Bejegyzés törölve!");
    },
  });

  return {
    terms,
    isLoading,
    createTerm: createTerm.mutateAsync,
    updateTerm: updateTerm.mutateAsync,
    deleteTerm: deleteTerm.mutateAsync,
  };
}
