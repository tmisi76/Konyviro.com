import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = async () => {
    if (!user) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Fetch chapter word counts and aggregate them per project
      if (data && data.length > 0) {
        const projectIds = data.map(p => p.id);
        const { data: chapters } = await supabase
          .from("chapters")
          .select("project_id, word_count")
          .in("project_id", projectIds);

        const wordCounts: Record<string, number> = {};
        chapters?.forEach(c => {
          wordCounts[c.project_id] = (wordCounts[c.project_id] || 0) + (c.word_count || 0);
        });

        // Update projects with real word counts from chapters
        const projectsWithRealWordCount = data.map(p => ({
          ...p,
          word_count: wordCounts[p.id] || 0
        }));

        setProjects(projectsWithRealWordCount);
      } else {
        setProjects(data || []);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (deleteError) {
        throw deleteError;
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      return true;
    } catch (err) {
      console.error("Error deleting project:", err);
      return false;
    }
  };

  const deleteMultipleProjects = async (projectIds: string[]): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (const id of projectIds) {
      try {
        const { error } = await supabase
          .from("projects")
          .delete()
          .eq("id", id);

        if (error) {
          failed++;
        } else {
          success++;
        }
      } catch {
        failed++;
      }
    }

    if (success > 0) {
      setProjects((prev) => prev.filter((p) => !projectIds.includes(p.id)));
    }

    return { success, failed };
  };

  const archiveProject = async (projectId: string): Promise<boolean> => {
    try {
      const { error: archiveError } = await supabase
        .from("projects")
        .update({ status: "archived" })
        .eq("id", projectId);

      if (archiveError) {
        throw archiveError;
      }

      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: "archived" } : p))
      );
      return true;
    } catch (err) {
      console.error("Error archiving project:", err);
      return false;
    }
  };

  const unarchiveProject = async (projectId: string): Promise<boolean> => {
    try {
      const { error: unarchiveError } = await supabase
        .from("projects")
        .update({ status: "active" })
        .eq("id", projectId);

      if (unarchiveError) {
        throw unarchiveError;
      }

      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: "active" } : p))
      );
      return true;
    } catch (err) {
      console.error("Error unarchiving project:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  // Real-time subscription a projektek változásaihoz (writing_status frissítések)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedProject = payload.new as Project;
          setProjects((prev) =>
            prev.map((p) => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Új projekt létrehozásakor újra lekérdezzük
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
    deleteProject,
    deleteMultipleProjects,
    archiveProject,
    unarchiveProject,
  };
}
