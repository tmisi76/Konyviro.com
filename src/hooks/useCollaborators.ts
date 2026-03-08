import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Collaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: "editor" | "reader";
  invited_by: string | null;
  invited_email: string | null;
  invited_at: string;
  accepted_at: string | null;
}

export function useCollaborators(projectId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ["collaborators", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_collaborators")
        .select("*")
        .eq("project_id", projectId)
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return data as Collaborator[];
    },
    enabled: !!projectId,
  });

  const inviteCollaborator = useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: "editor" | "reader";
    }) => {
      // Look up user by email in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("display_name", email)
        .maybeSingle();

      // For now, create with invited_email - user can accept later
      const { data, error } = await supabase
        .from("project_collaborators")
        .insert({
          project_id: projectId,
          user_id: profile?.user_id || user?.id, // placeholder
          role,
          invited_by: user?.id,
          invited_email: email,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", projectId] });
      toast.success("Meghívó elküldve!");
    },
    onError: (e: any) => {
      if (e.message?.includes("duplicate")) {
        toast.error("Ez a felhasználó már meghívva van");
      } else {
        toast.error(e.message);
      }
    },
  });

  const removeCollaborator = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_collaborators")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", projectId] });
      toast.success("Együttműködő eltávolítva");
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "editor" | "reader" }) => {
      const { error } = await supabase
        .from("project_collaborators")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", projectId] });
    },
  });

  return {
    collaborators,
    isLoading,
    inviteCollaborator: inviteCollaborator.mutateAsync,
    removeCollaborator: removeCollaborator.mutateAsync,
    updateRole: updateRole.mutateAsync,
    isInviting: inviteCollaborator.isPending,
  };
}
