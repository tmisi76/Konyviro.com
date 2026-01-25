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
  NonfictionBookType,
  BookTypeSpecificData,
} from "@/types/wizard";

const STORAGE_KEY = "book-wizard-data";

export function useBookWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    genre: null,
    subcategory: null,
    nonfictionBookType: null,
    bookTypeSpecificData: null,
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
    estimatedWritingMinutes: null,
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
    setData(prev => ({
      ...prev,
      subcategory,
      // Reset book type when subcategory changes for nonfiction
      nonfictionBookType: null,
      bookTypeSpecificData: null,
    }));
    setIsDirty(true);
  }, []);

  const setNonfictionBookType = useCallback((bookType: NonfictionBookType) => {
    setData(prev => ({
      ...prev,
      nonfictionBookType: bookType,
      // Clear downstream data
      bookTypeSpecificData: null,
      storyIdeas: [],
      selectedStoryIdea: null,
      detailedConcept: "",
      chapterOutline: [],
    }));
    setIsDirty(true);
  }, []);

  const setBookTypeSpecificData = useCallback((typeData: BookTypeSpecificData, length?: number) => {
    setData(prev => ({
      ...prev,
      bookTypeSpecificData: typeData,
      length: length || prev.length,
      // Clear downstream data
      storyIdeas: [],
      selectedStoryIdea: null,
      detailedConcept: "",
      chapterOutline: [],
    }));
    setIsDirty(true);
  }, []);

  const setBasicInfo = useCallback((info: {
    title: string;
    targetAudience: string;
    tone: Tone;
    length: number;
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

  const setEstimatedWritingMinutes = useCallback((minutes: number) => {
    updateData("estimatedWritingMinutes", minutes);
  }, [updateData]);

  // Fiction has 8 steps, szakkönyv has 9 steps (extra BookType step)
  const maxSteps = data.genre === "szakkonyv" ? 9 : 8;

  const nextStep = useCallback(() => {
    const max = data.genre === "szakkonyv" ? 9 : 8;
    setCurrentStep(prev => Math.min(prev + 1, max));
  }, [data.genre]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    const max = data.genre === "szakkonyv" ? 9 : 8;
    if (step >= 1 && step <= max) {
      setCurrentStep(step);
    }
  }, [data.genre]);

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
        target_word_count: data.length || 25000,
        additional_instructions: data.additionalInstructions || null,
        selected_story_idea: data.selectedStoryIdea ? JSON.parse(JSON.stringify(data.selectedStoryIdea)) : null,
        generated_story: data.detailedConcept || null,
        wizard_step: currentStep,
        writing_status: "draft",
        author_profile: data.authorProfile ? JSON.parse(JSON.stringify(data.authorProfile)) : null,
        fiction_style: data.fictionStyle ? JSON.parse(JSON.stringify(data.fictionStyle)) : null,
        nonfiction_book_type: data.nonfictionBookType || null,
        book_type_data: data.bookTypeSpecificData ? JSON.parse(JSON.stringify(data.bookTypeSpecificData)) : null,
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

  // Save characters from generated story to database
  const saveCharactersFromStory = useCallback(async (projectId: string, characters: Array<{
    name: string;
    role: string;
    age?: number;
    gender?: string;
    occupation?: string;
    appearance?: string;
    positiveTraits?: string[];
    negativeTraits?: string[];
    backstory?: string;
    motivation?: string;
    speechStyle?: string;
  }>): Promise<boolean> => {
    if (!characters || characters.length === 0) return true;

    try {
      // Delete existing characters first
      await supabase
        .from("characters")
        .delete()
        .eq("project_id", projectId);

      // Map characters to DB format
      const charactersToInsert = characters.map(char => ({
        project_id: projectId,
        name: char.name,
        role: char.role === "protagonist" ? "foszereploő" 
            : char.role === "antagonist" ? "antagonista" 
            : "mellekszereploő",
        age: char.age || null,
        gender: char.gender || null,
        occupation: char.occupation || null,
        appearance_description: char.appearance || null,
        positive_traits: char.positiveTraits || [],
        negative_traits: char.negativeTraits || [],
        backstory: char.backstory || null,
        motivations: char.motivation ? [char.motivation] : [],
        speech_style: char.speechStyle || null,
      }));

      const { error } = await supabase
        .from("characters")
        .insert(charactersToInsert);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error saving characters:", error);
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setData({
      genre: null,
      subcategory: null,
      nonfictionBookType: null,
      bookTypeSpecificData: null,
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
      estimatedWritingMinutes: null,
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
    maxSteps,
    data,
    isSaving,
    isDirty,
    setGenre,
    setSubcategory,
    setNonfictionBookType,
    setBookTypeSpecificData,
    setBasicInfo,
    setAuthorProfile,
    setFictionStyle,
    setStoryIdeas,
    selectStoryIdea,
    setDetailedConcept,
    setChapterOutline,
    setEstimatedWritingMinutes,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    saveProject,
    saveChapterOutline,
    saveCharactersFromStory,
    reset,
    startWriting,
    startSemiAutomatic,
  };
}
