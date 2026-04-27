import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CollaboratorRole = "reader" | "editor" | "admin";

export interface Collaborator {
  id: string;
  project_id: string;
  user_id: string;
  invited_email: string | null;
  role: CollaboratorRole;
  invited_at: string;
  accepted_at: string | null;
}

export function useCollaborators(projectId?: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["collaborators", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Collaborator[]> => {
      const { data, error } = await supabase
        .from("project_collaborators")
        .select("*")
        .eq("project_id", projectId!)
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Collaborator[];
    },
  });

  const invite = useMutation({
    mutationFn: async (input: { email: string; role: CollaboratorRole }) => {
      const { data, error } = await supabase.functions.invoke("invite-collaborator", {
        body: { project_id: projectId, email: input.email, role: input.role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Meghívó elküldve");
      qc.invalidateQueries({ queryKey: ["collaborators", projectId] });
    },
    onError: (e: Error) => toast.error(e.message || "Meghívás sikertelen"),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: CollaboratorRole }) => {
      const { error } = await supabase
        .from("project_collaborators")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Szerepkör frissítve");
      qc.invalidateQueries({ queryKey: ["collaborators", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_collaborators")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Munkatárs eltávolítva");
      qc.invalidateQueries({ queryKey: ["collaborators", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...list, invite, updateRole, remove };
}