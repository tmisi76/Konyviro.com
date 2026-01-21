import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ProjectFormData } from "@/components/projects/CreateProjectModal";

export function useCreateProject() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const createProject = async (formData: ProjectFormData): Promise<boolean> => {
    if (!user) {
      toast.error("Be kell jelentkezned a projekt létrehozásához");
      return false;
    }

    if (!formData.genre || !formData.title.trim() || !formData.targetAudience || !formData.tone) {
      toast.error("Kérlek töltsd ki az összes kötelező mezőt");
      return false;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from("projects").insert({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        genre: formData.genre,
        target_audience: formData.targetAudience,
        target_word_count: formData.targetWordCount,
        tone: formData.tone,
        complexity: formData.complexity,
        style_descriptive: formData.styleDescriptive,
        style_dialogue: formData.styleDialogue,
        style_action: formData.styleAction,
      });

      if (error) {
        console.error("Error creating project:", error);
        toast.error("Hiba történt a projekt létrehozásakor");
        return false;
      }

      toast.success("Projekt sikeresen létrehozva!");
      return true;
    } catch (err) {
      console.error("Error creating project:", err);
      toast.error("Váratlan hiba történt");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { createProject, isLoading };
}
