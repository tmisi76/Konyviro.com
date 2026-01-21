import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

export function useProjectDetails(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    const fetchProject = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        setProject(data);
      } catch (err) {
        console.error("Error fetching project:", err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const updateProject = async (updates: Partial<Project>) => {
    if (!projectId) return false;

    try {
      const { error: updateError } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", projectId);

      if (updateError) {
        throw updateError;
      }

      setProject((prev) => (prev ? { ...prev, ...updates } : null));
      return true;
    } catch (err) {
      console.error("Error updating project:", err);
      return false;
    }
  };

  return { project, isLoading, error, updateProject };
}
