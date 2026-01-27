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
      // Build story structure from generated story
      const storyStructure = formData.generatedStory ? {
        protagonist: formData.generatedStory.protagonist,
        antagonist: formData.generatedStory.antagonist,
        setting: formData.generatedStory.setting,
        themes: formData.generatedStory.themes,
        plotPoints: formData.generatedStory.plotPoints,
        chapters: formData.generatedStory.chapters,
      } : null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertData: any = {
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
        story_idea: formData.storyIdea?.trim() || null,
        generated_story: formData.generatedStory?.synopsis || null,
        story_structure: storyStructure,
      };

      const { error } = await supabase.from("projects").insert(insertData);

      if (error) {
        console.error("Error creating project:", error);
        toast.error("Hiba történt a projekt létrehozásakor");
        return false;
      }

      // Increment projects_created count for the user (no p_user_id needed - uses auth.uid())
      const { error: usageError } = await supabase.rpc("increment_projects_created");
      if (usageError) {
        console.error("Failed to update project count:", usageError);
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
