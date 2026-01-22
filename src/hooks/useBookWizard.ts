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
  AuthorProfile,
  FictionStyleSettings,
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
    authorProfile: null,
    fictionStyle: null,
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
      // Töröljük az ötleteket és minden utána következő adatot, hogy újrageneráljuk
      storyIdeas: [],
      selectedStoryIdea: null,
      detailedConcept: "",
      chapterOutline: [],
    }));
    setIsDirty(true);
  }, []);

  const setAuthorProfile = useCallback((profile: AuthorProfile) => {
    setData(prev => ({
      ...prev,
      authorProfile: profile,
      // Clear subsequent data when author profile changes
      storyIdeas: [],
      selectedStoryIdea: null,
      detailedConcept: "",
      chapterOutline: [],
    }));
    setIsDirty(true);
  }, []);

  const setFictionStyle = useCallback((style: FictionStyleSettings) => {
    setData(prev => ({
      ...prev,
      fictionStyle: style,
      // Clear subsequent data when style changes
      storyIdeas: [],
      selectedStoryIdea: null,
      detailedConcept: "",
      chapterOutline: [],
    }));
    setIsDirty(true);
  }, []);

  const setStoryIdeas = useCallback((ideas: StoryIdea[]) => {
    updateData("storyIdeas", ideas);
  }, [updateData]);

  const selectStoryIdea = useCallback((idea: StoryIdea) => {
    updateData("selectedStoryIdea", idea);
    // Töröljük a korábbi koncepciót, hogy új generálódjon
    updateData("detailedConcept", "");
    // Töröljük a korábbi fejezet struktúrát is
    updateData("chapterOutline", []);
  }, [updateData]);

  const setDetailedConcept = useCallback((concept: string) => {
    updateData("detailedConcept", concept);
  }, [updateData]);

  const setChapterOutline = useCallback((outline: ChapterOutlineItem[]) => {
    updateData("chapterOutline", outline);
    setIsDirty(true);
  }, [updateData]);

  // Fiction has 8 steps, szakkonyv has 8 steps too
  const maxSteps = 8;

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, maxSteps));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= maxSteps) {
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
        author_profile: data.authorProfile ? JSON.parse(JSON.stringify(data.authorProfile)) : null,
        fiction_style: data.fictionStyle ? JSON.parse(JSON.stringify(data.fictionStyle)) : null,
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
        
        // Increment projects_created count for the user
        if (user) {
          const { error: usageError } = await supabase.rpc("increment_projects_created", {
            p_user_id: user.id,
          });
          if (usageError) {
            console.error("Failed to update project count:", usageError);
          }
        }
        
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
      authorProfile: null,
      fictionStyle: null,
    });
    setCurrentStep(1);
    setIsDirty(false);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const startWriting = useCallback(async () => {
    let projectIdToUse = data.projectId;
    
    if (!projectIdToUse) {
      const savedProjectId = await saveProject();
      if (!savedProjectId) return;
      projectIdToUse = savedProjectId;
    }
    
    // Update writing status
    await supabase
      .from("projects")
      .update({ writing_status: "in_progress", wizard_step: 8 })
      .eq("id", projectIdToUse);

    // Navigate to step 8 within the wizard
    setData(prev => ({ ...prev, projectId: projectIdToUse }));
    setCurrentStep(8);
  }, [data.projectId, saveProject]);

  const startSemiAutomatic = useCallback(async () => {
    let projectIdToUse = data.projectId;
    
    if (!projectIdToUse) {
      const savedProjectId = await saveProject();
      if (!savedProjectId) {
        throw new Error("Nem sikerült menteni a projektet");
      }
      projectIdToUse = savedProjectId;
    }
    
    // Update project status to draft (wizard completed, manual editing mode)
    await supabase
      .from("projects")
      .update({ 
        writing_status: "draft",
        wizard_step: 7  // Mark wizard as completed
      })
      .eq("id", projectIdToUse);

    // Reset wizard and navigate to editor
    reset();
    navigate(`/project/${projectIdToUse}`);
  }, [data.projectId, saveProject, reset, navigate]);

  return {
    currentStep,
    data,
    isSaving,
    isDirty,
    setGenre,
    setSubcategory,
    setBasicInfo,
    setAuthorProfile,
    setFictionStyle,
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
    startSemiAutomatic,
  };
}
