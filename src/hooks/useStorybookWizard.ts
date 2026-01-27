import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { 
  StorybookData, 
  StorybookTheme, 
  AgeGroup, 
  IllustrationStyle,
  CharacterPhoto,
  StorybookPage,
  INITIAL_STORYBOOK_DATA,
} from "@/types/storybook";

const STORAGE_KEY = "storybook-wizard-data";

export function useStorybookWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<StorybookData>({
    title: "",
    theme: null,
    ageGroup: null,
    illustrationStyle: null,
    characters: [],
    storyPrompt: "",
    pages: [],
    projectId: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  // Ref to track current pages - avoids stale closure issues
  const pagesRef = useRef<StorybookPage[]>([]);

  // Sync ref with state
  useEffect(() => {
    pagesRef.current = data.pages;
  }, [data.pages]);

  // Total steps for storybook wizard
  const maxSteps = 7;

  // Load existing project from URL param (projectId)
  useEffect(() => {
    const projectIdParam = searchParams.get("projectId");
    
    if (projectIdParam && user && !data.projectId) {
      loadExistingProject(projectIdParam);
    }
  }, [searchParams, user]);

  const loadExistingProject = async (projectId: string) => {
    setIsLoadingProject(true);
    try {
      const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;

      if (project?.storybook_data) {
        const storybookData = typeof project.storybook_data === 'string' 
          ? JSON.parse(project.storybook_data) 
          : project.storybook_data;
        
        // Sync pages ref immediately
        pagesRef.current = storybookData.pages || [];
        
        setData({
          title: project.title || storybookData.title || "",
          theme: storybookData.theme || null,
          customThemeDescription: storybookData.customThemeDescription,
          ageGroup: storybookData.ageGroup || null,
          illustrationStyle: storybookData.illustrationStyle || null,
          characters: storybookData.characters || [],
          storyPrompt: storybookData.storyPrompt || "",
          generatedStory: storybookData.generatedStory,
          pages: storybookData.pages || [],
          coverUrl: storybookData.coverUrl,
          projectId: project.id,
        });
        
        // Navigate to preview step (step 7)
        setCurrentStep(7);
        setIsDirty(false);
      }
    } catch (error) {
      console.error("Error loading storybook project:", error);
      toast.error("Hiba a mesekönyv betöltése során");
    } finally {
      setIsLoadingProject(false);
    }
  };

  // Load from session storage on mount (only if not loading from URL param)
  useEffect(() => {
    const projectIdParam = searchParams.get("projectId");
    // Skip session storage loading if we're loading an existing project from URL
    if (projectIdParam) return;
    
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
  }, [searchParams]);

  // Save to session storage on changes
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      data,
      step: currentStep,
    }));
  }, [data, currentStep]);

  const updateData = useCallback(<K extends keyof StorybookData>(
    key: K, 
    value: StorybookData[K]
  ) => {
    setData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const setTheme = useCallback((theme: StorybookTheme) => {
    updateData("theme", theme);
  }, [updateData]);

  const setCustomThemeDescription = useCallback((description: string) => {
    updateData("customThemeDescription", description);
  }, [updateData]);

  const setAgeGroup = useCallback((ageGroup: AgeGroup) => {
    updateData("ageGroup", ageGroup);
  }, [updateData]);

  const setIllustrationStyle = useCallback((style: IllustrationStyle) => {
    updateData("illustrationStyle", style);
  }, [updateData]);

  const setTitle = useCallback((title: string) => {
    updateData("title", title);
  }, [updateData]);

  const setStoryPrompt = useCallback((prompt: string) => {
    updateData("storyPrompt", prompt);
  }, [updateData]);

  const addCharacter = useCallback((character: CharacterPhoto) => {
    setData(prev => ({
      ...prev,
      characters: [...prev.characters, character],
    }));
    setIsDirty(true);
  }, []);

  const removeCharacter = useCallback((characterId: string) => {
    setData(prev => ({
      ...prev,
      characters: prev.characters.filter(c => c.id !== characterId),
    }));
    setIsDirty(true);
  }, []);

  const updateCharacter = useCallback((characterId: string, updates: Partial<CharacterPhoto>) => {
    setData(prev => ({
      ...prev,
      characters: prev.characters.map(c => 
        c.id === characterId ? { ...c, ...updates } : c
      ),
    }));
    setIsDirty(true);
  }, []);

  const setPages = useCallback((pages: StorybookPage[]) => {
    // Immediately sync ref to avoid race conditions
    pagesRef.current = pages;
    updateData("pages", pages);
  }, [updateData]);

  const updatePage = useCallback((pageId: string, updates: Partial<StorybookPage>) => {
    setData(prev => {
      const nextPages = prev.pages.map(p => 
        p.id === pageId ? { ...p, ...updates } : p
      );
      // Immediately sync ref to avoid race conditions
      pagesRef.current = nextPages;
      return { ...prev, pages: nextPages };
    });
    setIsDirty(true);
  }, []);

  const setCoverUrl = useCallback((url: string) => {
    updateData("coverUrl", url);
  }, [updateData]);

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

  const reset = useCallback(() => {
    setData({
      title: "",
      theme: null,
      ageGroup: null,
      illustrationStyle: null,
      characters: [],
      storyPrompt: "",
      pages: [],
      projectId: null,
    });
    setCurrentStep(1);
    setIsDirty(false);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  // Supported image formats
  const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

  // Upload character photo to Supabase Storage
  const uploadCharacterPhoto = useCallback(async (file: File): Promise<string | null> => {
    if (!user) {
      toast.error("Be kell jelentkezned");
      return null;
    }

    // Validate file format
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      toast.error("Ez a képformátum nem támogatott. Kérlek használj JPG, PNG vagy WebP formátumot.");
      return null;
    }

    try {
      // Determine file extension from MIME type
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };
      const fileExt = extMap[file.type] || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("project-assets")
        .upload(`storybook-characters/${fileName}`, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("project-assets")
        .getPublicUrl(`storybook-characters/${fileName}`);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Hiba a fotó feltöltése során");
      return null;
    }
  }, [user]);

  // Generate story with AI
  const generateStory = useCallback(async (): Promise<{ success: boolean; coverPrompt?: string }> => {
    if (!user) {
      toast.error("Be kell jelentkezned");
      return { success: false };
    }

    setIsGenerating(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("generate-storybook", {
        body: {
          theme: data.theme,
          customThemeDescription: data.customThemeDescription,
          ageGroup: data.ageGroup,
          illustrationStyle: data.illustrationStyle,
          characters: data.characters,
          storyPrompt: data.storyPrompt,
          title: data.title,
        },
      });

      if (error) throw error;

      if (response.story) {
        updateData("generatedStory", response.story);
      }
      if (response.pages) {
        // CRITICAL: Immediately sync ref BEFORE state update to ensure
        // generateAllIllustrations() sees the new pages right away
        pagesRef.current = response.pages;
        updateData("pages", response.pages);
      }
      if (response.title && !data.title) {
        updateData("title", response.title);
      }

      return { success: true, coverPrompt: response.coverPrompt || null };
    } catch (error) {
      console.error("Error generating story:", error);
      toast.error("Hiba a történet generálása során");
      return { success: false };
    } finally {
      setIsGenerating(false);
    }
  }, [user, data, updateData]);

  // Generate illustration for a page with extended timeout
  const generateIllustration = useCallback(async (
    pageId: string,
    pageData?: StorybookPage // Optional: pass page data directly to avoid closure issues
  ): Promise<boolean> => {
    if (!user) {
      toast.error("Be kell jelentkezned");
      return false;
    }

    // Use passed page data or find from ref (not from stale closure)
    const page = pageData || pagesRef.current.find(p => p.id === pageId);
    if (!page) return false;

    updatePage(pageId, { isGenerating: true });

    try {
      // Get session for auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Nincs aktív munkamenet");
      }

      // Use native fetch with 3-minute timeout for long AI generation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-storybook-illustration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            prompt: page.illustrationPrompt,
            style: data.illustrationStyle,
            characters: data.characters,
            pageNumber: page.pageNumber,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const responseData = await response.json();

      if (responseData.imageUrl) {
        updatePage(pageId, { 
          illustrationUrl: responseData.imageUrl,
          isGenerating: false,
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error generating illustration:", error);
      const isTimeout = error instanceof Error && error.name === "AbortError";
      toast.error(isTimeout 
        ? "Az illusztráció generálása túl sokáig tartott. Próbáld újra később."
        : "Hiba az illusztráció generálása során"
      );
      updatePage(pageId, { isGenerating: false });
      return false;
    }
  }, [user, data.illustrationStyle, data.characters, updatePage]);

  // Generate all illustrations with progress callback and robust error handling
  const generateAllIllustrations = useCallback(async (
    onProgress?: (current: number, total: number) => void
  ): Promise<boolean> => {
    // Get current pages from ref to avoid stale closure
    const currentPages = pagesRef.current;
    
    // Guard: if no pages exist, fail early instead of silently "succeeding"
    if (currentPages.length === 0) {
      toast.error("Nem találok oldalakat a képgeneráláshoz. Kérlek próbáld újra.");
      return false;
    }
    
    const pagesToGenerate = currentPages.filter(p => !p.illustrationUrl);
    const total = pagesToGenerate.length;
    
    // If no pages need generation (all have URLs), that's fine
    if (total === 0) {
      return true;
    }
    
    let successCount = 0;
    const failedPages: string[] = [];
    
    for (let i = 0; i < pagesToGenerate.length; i++) {
      const page = pagesToGenerate[i];
      onProgress?.(i + 1, total);
      
      // Pass page data directly to avoid closure issues
      const success = await generateIllustration(page.id, page);
      
      if (success) {
        successCount++;
      } else {
        failedPages.push(`${page.pageNumber}. oldal`);
      }
      
      // Increased delay between generations to avoid rate limiting
      if (i < pagesToGenerate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // If at least some succeeded, allow continuing with warning
    if (successCount > 0 && failedPages.length > 0) {
      toast.warning(`${failedPages.length} illusztráció nem készült el: ${failedPages.join(", ")}`);
      return true; // Allow continuing with partial results
    }
    
    return successCount === total;
  }, [generateIllustration]);

  // Generate cover image from prompt
  const generateCover = useCallback(async (coverPrompt: string): Promise<boolean> => {
    if (!user || !coverPrompt) return false;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) return false;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-storybook-illustration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            prompt: coverPrompt,
            style: data.illustrationStyle,
            characters: data.characters,
            pageNumber: 0, // Cover
          }),
        }
      );

      if (!response.ok) return false;

      const responseData = await response.json();
      if (responseData.imageUrl) {
        setCoverUrl(responseData.imageUrl);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error generating cover:", error);
      return false;
    }
  }, [user, data.illustrationStyle, data.characters, setCoverUrl]);

  // Save project to database
  const saveProject = useCallback(async (): Promise<string | null> => {
    if (!user) {
      toast.error("Be kell jelentkezned");
      return null;
    }

    setIsSaving(true);
    try {
      // Check if all pages have illustrations - if so, mark as completed
      const allIllustrationsComplete = data.pages.length > 0 && 
        data.pages.every(p => p.illustrationUrl);

      const projectData = {
        user_id: user.id,
        title: data.title || "Új mesekönyv",
        genre: "mesekonyv",
        subcategory: data.theme,
        target_audience: data.ageGroup,
        writing_status: allIllustrationsComplete ? "completed" : "draft",
        storybook_data: JSON.stringify({
          theme: data.theme,
          customThemeDescription: data.customThemeDescription,
          ageGroup: data.ageGroup,
          illustrationStyle: data.illustrationStyle,
          characters: data.characters,
          storyPrompt: data.storyPrompt,
          generatedStory: data.generatedStory,
          pages: data.pages,
          coverUrl: data.coverUrl,
        }),
      };

      if (data.projectId) {
        // Update existing project
        const { error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", data.projectId);

        if (error) throw error;
        setIsDirty(false);
        toast.success("Mesekönyv mentve");
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
        toast.success("Mesekönyv létrehozva");
        return newProject.id;
      }
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Hiba a mentés során");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, data, updateData]);

  return {
    currentStep,
    maxSteps,
    data,
    isSaving,
    isGenerating,
    isDirty,
    isLoadingProject,
    setTheme,
    setCustomThemeDescription,
    setAgeGroup,
    setIllustrationStyle,
    setTitle,
    setStoryPrompt,
    addCharacter,
    removeCharacter,
    updateCharacter,
    setPages,
    updatePage,
    setCoverUrl,
    nextStep,
    prevStep,
    goToStep,
    reset,
    uploadCharacterPhoto,
    generateStory,
    generateIllustration,
    generateAllIllustrations,
    generateCover,
    saveProject,
  };
}
