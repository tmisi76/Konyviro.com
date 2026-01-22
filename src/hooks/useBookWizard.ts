import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { 
  WizardData, 
  Genre, 
  Subcategory, 
  Tone, 
  BookLength,
  StoryIdea,
  ChapterOutlineItem,
  INITIAL_WIZARD_DATA 
} from "@/types/wizard";

const STORAGE_KEY = "book-wizard-data";

export function useBookWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    genre: null,
    subcategory: null,
    title: "",
    targetAudience: "",
    tone: null,
    length: null,
    additionalInstructions: "",
    storyIdeas: [],
    selectedStoryIdea: null,
    detailedConcept: "",
    chapterOutline: [],
    projectId: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Load from session storage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed.data);
        setCurrentStep(parsed.step);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save to session storage on changes
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      data,
      step: currentStep,
    }));
  }, [data, currentStep]);

  const updateData = useCallback(<K extends keyof WizardData>(
    key: K, 
    value: WizardData[K]
  ) => {
    setData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const setGenre = useCallback((genre: Genre) => {
    updateData("genre", genre);
    updateData("subcategory", null); // Reset subcategory when genre changes
  }, [updateData]);

  const setSubcategory = useCallback((subcategory: Subcategory) => {
    updateData("subcategory", subcategory);
  }, [updateData]);

  const setBasicInfo = useCallback((info: {
    title: string;
    targetAudience: string;
    tone: Tone;
    length: BookLength;
    additionalInstructions: string;
  }) => {
    setData(prev => ({
      ...prev,
      ...info,
    }));
    setIsDirty(true);
  }, []);

  const setStoryIdeas = useCallback((ideas: StoryIdea[]) => {
    updateData("storyIdeas", ideas);
  }, [updateData]);

  const selectStoryIdea = useCallback((idea: StoryIdea) => {
    updateData("selectedStoryIdea", idea);
  }, [updateData]);

  const setDetailedConcept = useCallback((concept: string) => {
    updateData("detailedConcept", concept);
  }, [updateData]);

  const setChapterOutline = useCallback((outline: ChapterOutlineItem[]) => {
    updateData("chapterOutline", outline);
    setIsDirty(true);
  }, [updateData]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 7));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 7) {
      setCurrentStep(step);
    }
  }, []);

  // Create or update project in Supabase
  const saveProject = useCallback(async (): Promise<string | null> => {
    if (!user) {
      toast.error("Be kell jelentkezned");
      return null;
    }

    setIsSaving(true);
    try {
      // Determine the actual genre value for database
      // If fiction with erotikus subcategory, use "erotikus", otherwise use genre or "fiction"
      let dbGenre: string | null = data.genre;
      if (data.genre === "fiction" && data.subcategory === "erotikus") {
        dbGenre = "erotikus";
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projectData: any = {
        user_id: user.id,
        title: data.title || `Új ${data.genre === "fiction" ? "regény" : "szakkönyv"}`,
        genre: dbGenre,
        subcategory: data.subcategory,
        target_audience: data.targetAudience || null,
        tone: data.tone,
        target_word_count: data.length === "short" ? 30000 : data.length === "medium" ? 60000 : 100000,
        additional_instructions: data.additionalInstructions || null,
        selected_story_idea: data.selectedStoryIdea ? JSON.parse(JSON.stringify(data.selectedStoryIdea)) : null,
        generated_story: data.detailedConcept || null,
        wizard_step: currentStep,
        writing_status: "draft",
      };

      if (data.projectId) {
        // Update existing project
        const { error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", data.projectId);

        if (error) throw error;
        setIsDirty(false);
        return data.projectId;
      } else {
        // Create new project
        const { data: newProject, error } = await supabase
          .from("projects")
          .insert(projectData)
          .select("id")
          .single();

        if (error) throw error;
        updateData("projectId", newProject.id);
        setIsDirty(false);
        return newProject.id;
      }
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Hiba történt a mentés során");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, data, currentStep, updateData]);

  // Save chapter outline to database
  const saveChapterOutline = useCallback(async (projectId: string): Promise<boolean> => {
    if (!data.chapterOutline.length) return true;

    try {
      // First delete existing chapters
      await supabase
        .from("chapters")
        .delete()
        .eq("project_id", projectId);

      // Insert new chapters
      const chaptersToInsert = data.chapterOutline.map((chapter, index) => ({
        project_id: projectId,
        title: chapter.title,
        summary: chapter.description,
        key_points: chapter.keyPoints,
        sort_order: index,
        status: "draft",
        word_count: 0,
      }));

      const { error } = await supabase
        .from("chapters")
        .insert(chaptersToInsert);

      if (error) throw error;
      setIsDirty(false);
      toast.success("Fejezetek mentve");
      return true;
    } catch (error) {
      console.error("Error saving chapters:", error);
      toast.error("Hiba történt a fejezetek mentése során");
      return false;
    }
  }, [data.chapterOutline]);

  const reset = useCallback(() => {
    setData({
      genre: null,
      subcategory: null,
      title: "",
      targetAudience: "",
      tone: null,
      length: null,
      additionalInstructions: "",
      storyIdeas: [],
      selectedStoryIdea: null,
      detailedConcept: "",
      chapterOutline: [],
      projectId: null,
    });
    setCurrentStep(1);
    setIsDirty(false);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const startWriting = useCallback(async () => {
    if (!data.projectId) {
      const projectId = await saveProject();
      if (!projectId) return;
    }
    
    // Update writing status
    await supabase
      .from("projects")
      .update({ writing_status: "in_progress", wizard_step: 7 })
      .eq("id", data.projectId);

    navigate(`/project/${data.projectId}?autowrite=true`);
  }, [data.projectId, saveProject, navigate]);

  return {
    currentStep,
    data,
    isSaving,
    isDirty,
    setGenre,
    setSubcategory,
    setBasicInfo,
    setStoryIdeas,
    selectStoryIdea,
    setDetailedConcept,
    setChapterOutline,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    saveProject,
    saveChapterOutline,
    reset,
    startWriting,
  };
}
