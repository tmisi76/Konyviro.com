import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SceneOutline, AutoWriteProgress, ChapterWithScenes } from "@/types/autowrite";
import type { Block } from "@/types/editor";
import { useAuth } from "@/contexts/AuthContext";

interface UseAutoWriteOptions {
  projectId: string;
  genre: string;
  storyStructure?: Record<string, unknown>;
  charactersContext?: string;
  bookTopic?: string;
  targetAudience?: string;
  onBlockCreated?: (chapterId: string, block: Block) => void;
  onChapterUpdated?: (chapterId: string) => void;
  onStreamingUpdate?: (text: string) => void;
}

// URLs for fiction (scenes)
const OUTLINE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-detailed-outline`;
const WRITE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/write-scene`;

// URLs for non-fiction (sections)
const SECTION_OUTLINE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-section-outline`;
const WRITE_SECTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/write-section`;

export function useAutoWrite({
  projectId,
  genre,
  storyStructure,
  charactersContext,
  bookTopic,
  targetAudience,
  onBlockCreated,
  onChapterUpdated,
  onStreamingUpdate,
}: UseAutoWriteOptions) {
  // Determine if this is a non-fiction project
  const isNonFiction = genre === "szakkonyv";
  const [chapters, setChapters] = useState<ChapterWithScenes[]>([]);
  const [progress, setProgress] = useState<AutoWriteProgress>({
    totalScenes: 0,
    completedScenes: 0,
    totalWords: 0,
    targetWords: 50000,
    currentChapterIndex: 0,
    currentSceneIndex: 0,
    status: "idle",
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const { user } = useAuth();
  const isPausedRef = useRef(false);
  const isRunningRef = useRef(false);

  // Fetch chapters with scene outlines
  const fetchChapters = useCallback(async () => {
    const { data, error } = await supabase
      .from("chapters")
      .select("id, title, sort_order, scene_outline, generation_status, word_count")
      .eq("project_id", projectId)
      .order("sort_order");

    if (error) {
      console.error("Error fetching chapters:", error);
      return;
    }

    const chaptersWithScenes = (data || []).map(ch => ({
      ...ch,
      scene_outline: (ch.scene_outline as unknown as SceneOutline[]) || [],
      generation_status: (ch.generation_status as ChapterWithScenes["generation_status"]) || "pending",
    }));

    setChapters(chaptersWithScenes);

    // Calculate progress
    let totalScenes = 0;
    let completedScenes = 0;
    let totalWords = 0;

    chaptersWithScenes.forEach(ch => {
      totalScenes += ch.scene_outline.length;
      completedScenes += ch.scene_outline.filter(s => s && s.status === "done").length;
      totalWords += ch.word_count;
    });

    setProgress(prev => ({
      ...prev,
      totalScenes,
      completedScenes,
      totalWords,
    }));
  }, [projectId]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  // Generate outline for a single chapter (genre-aware)
  const generateOutlineForChapter = useCallback(async (
    chapter: ChapterWithScenes,
    previousChaptersSummary?: string,
    nextChapterTitle?: string
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Choose URL based on genre
    const url = isNonFiction ? SECTION_OUTLINE_URL : OUTLINE_URL;

    const body = isNonFiction 
      ? {
          projectId,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          bookTopic: bookTopic || storyStructure?.mainTopic,
          targetAudience,
          learningObjectives: storyStructure?.learningObjectives,
          previousChaptersSummary,
          nextChapterTitle,
        }
      : {
          projectId,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          storyStructure,
          characters: charactersContext,
          genre,
          previousChaptersSummary,
          nextChapterTitle,
        };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMessage = isNonFiction ? "Szekció vázlat generálási hiba" : "Jelenet vázlat generálási hiba";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        console.error("Failed to parse error response");
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    // Filter out null/undefined scenes from the outline
    const sceneOutline = (data.sceneOutline as SceneOutline[]) || [];
    return sceneOutline.filter(s => s != null);
  }, [projectId, storyStructure, charactersContext, genre, isNonFiction, bookTopic, targetAudience]);

  // Generate outlines for all chapters
  const generateAllOutlines = useCallback(async () => {
    setProgress(prev => ({ ...prev, status: "generating_outline" }));
    isPausedRef.current = false;

    try {
      for (let i = 0; i < chapters.length; i++) {
        if (isPausedRef.current) {
          setProgress(prev => ({ ...prev, status: "paused" }));
          return;
        }

        const chapter = chapters[i];
        
        // Skip if already has outline
        if (chapter.scene_outline.length > 0) continue;

        setProgress(prev => ({ ...prev, currentChapterIndex: i }));

        // Build previous chapters summary with null-safe scene mapping
        const previousSummary = chapters
          .slice(0, i)
          .map(c => {
            const sceneDescriptions = (c.scene_outline || [])
              .filter(s => s != null && s.description)
              .map(s => s.description)
              .join(". ");
            return `${c.title}: ${sceneDescriptions}`;
          })
          .join("\n");

        const nextChapterTitle = chapters[i + 1]?.title;

        await generateOutlineForChapter(chapter, previousSummary, nextChapterTitle);
        await fetchChapters();
      }

      setProgress(prev => ({ ...prev, status: "idle" }));
      toast.success("Minden fejezet vázlata elkészült!");
    } catch (error) {
      console.error("Outline generation error:", error);
      setProgress(prev => ({ 
        ...prev, 
        status: "error",
        error: error instanceof Error ? error.message : "Ismeretlen hiba"
      }));
      toast.error(error instanceof Error ? error.message : "Hiba a vázlat generálása közben");
    }
  }, [chapters, generateOutlineForChapter, fetchChapters]);

  // Write a single scene/section (genre-aware) with enhanced retry logic
  const writeScene = useCallback(async (
    chapter: ChapterWithScenes,
    sceneIndex: number,
    previousContent: string,
    retryCount = 0
  ): Promise<string> => {
    const MAX_RETRIES = 7;
    const BASE_DELAY = 5000; // 5 seconds base delay
    const MAX_DELAY = 120000; // Maximum 2 perc
    
    const scene = chapter.scene_outline[sceneIndex];
    
    if (!scene) {
      throw new Error(`Jelenet ${sceneIndex + 1} nem található a fejezetben`);
    }
    const { data: { session } } = await supabase.auth.getSession();

    abortControllerRef.current = new AbortController();

    // Choose URL and body based on genre
    const url = isNonFiction ? WRITE_SECTION_URL : WRITE_URL;

    const body = isNonFiction
      ? {
          projectId,
          chapterId: chapter.id,
          sectionNumber: scene.scene_number,
          sectionOutline: scene,
          previousContent: previousContent.slice(-3000),
          bookTopic: bookTopic || storyStructure?.mainTopic,
          targetAudience,
          chapterTitle: chapter.title,
        }
      : {
          projectId,
          chapterId: chapter.id,
          sceneNumber: scene.scene_number,
          sceneOutline: scene,
          previousContent: previousContent.slice(-3000),
          characters: charactersContext,
          storyStructure,
          genre,
          chapterTitle: chapter.title,
        };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
      signal: abortControllerRef.current.signal,
    });

    // Handle rate limiting with exponential backoff + max delay
    if (response.status === 429) {
      if (retryCount >= MAX_RETRIES) {
        throw new Error("Túl sok próbálkozás után sem sikerült. Kérlek próbáld újra később.");
      }
      
      const delay = Math.min(BASE_DELAY * Math.pow(2, retryCount), MAX_DELAY); // 5s, 10s, 20s, 40s, 80s, max 120s
      console.log(`Rate limited. Retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      toast.info(`AI válaszra várakozás... ${Math.ceil(delay / 1000)} másodperc`, { duration: delay });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return writeScene(chapter, sceneIndex, previousContent, retryCount + 1);
    }
    
    // Handle transient server errors with retry
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      if (retryCount >= MAX_RETRIES) {
        throw new Error("Az AI szolgáltatás túlterhelt. Próbáld újra pár perc múlva.");
      }
      
      const delay = Math.min(BASE_DELAY * Math.pow(1.5, retryCount), MAX_DELAY);
      console.log(`Server error ${response.status}. Retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      toast.info(`Szerver hiba, újrapróbálás ${Math.ceil(delay / 1000)} mp múlva...`, { duration: delay });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return writeScene(chapter, sceneIndex, previousContent, retryCount + 1);
    }

    if (!response.ok) {
      let errorMessage = isNonFiction ? "Szekció írási hiba" : "Jelenet írási hiba";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        console.error("Failed to parse error response");
      }
      throw new Error(errorMessage);
    }

    // Parse JSON response (no longer streaming)
    const data = await response.json();
    const fullText = data.content || "";
    
    // Word count is now tracked server-side, no need to track here
    console.log(`Scene written: ${data.wordCount || 0} words (tracked server-side)`);
    
    // Notify streaming update for preview
    if (fullText && onStreamingUpdate) {
      // Szimulált streaming hatás: a szöveget fokozatosan jelenítjük meg
      const words = fullText.split(/\s+/);
      let displayed = "";
      for (let i = 0; i < words.length; i += 5) {
        displayed = words.slice(0, i + 5).join(" ");
        onStreamingUpdate(displayed);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }

    return fullText;
  }, [projectId, charactersContext, storyStructure, genre, isNonFiction, bookTopic, targetAudience, onStreamingUpdate]);

  // Save scene content as blocks
  const saveSceneAsBlocks = useCallback(async (
    chapterId: string,
    sceneText: string,
    startingSortOrder: number
  ) => {
    // Split into paragraphs
    const paragraphs = sceneText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const blocks = paragraphs.map((content, index) => ({
      chapter_id: chapterId,
      type: "paragraph",
      content,
      sort_order: startingSortOrder + index,
      metadata: {},
    }));

    const { data, error } = await supabase
      .from("blocks")
      .insert(blocks)
      .select();

    if (error) {
      console.error("Error saving blocks:", error);
      throw error;
    }

    return data;
  }, []);

  // Update scene status in chapter
  const updateSceneStatus = useCallback(async (
    chapterId: string,
    sceneIndex: number,
    status: SceneOutline["status"]
  ) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const updatedOutline = [...chapter.scene_outline];
    updatedOutline[sceneIndex] = { ...updatedOutline[sceneIndex], status };

    await supabase
      .from("chapters")
      .update({ scene_outline: JSON.parse(JSON.stringify(updatedOutline)) })
      .eq("id", chapterId);
  }, [chapters]);

  // Main auto-write function
  const startAutoWrite = useCallback(async () => {
    // Prevent accidental parallel runs (double-click retry / resume while already running).
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    setProgress(prev => ({ ...prev, status: "writing" }));
    isPausedRef.current = false;

    try {
      // First, ensure all chapters have outlines
      const chaptersWithoutOutline = chapters.filter(c => c.scene_outline.length === 0);
      if (chaptersWithoutOutline.length > 0) {
        await generateAllOutlines();
        await fetchChapters();
      }

      // Get fresh chapter data
      const { data: freshChapters } = await supabase
        .from("chapters")
        .select("id, title, sort_order, scene_outline, generation_status, word_count")
        .eq("project_id", projectId)
        .order("sort_order");

      if (!freshChapters) return;

      const chaptersData = freshChapters.map(ch => ({
        ...ch,
        scene_outline: (ch.scene_outline as unknown as SceneOutline[]) || [],
        generation_status: (ch.generation_status as ChapterWithScenes["generation_status"]) || "pending",
      }));

      let allPreviousContent = "";
      let completedCount = 0;

      for (let chapterIndex = 0; chapterIndex < chaptersData.length; chapterIndex++) {
        if (isPausedRef.current) {
          setProgress(prev => ({ ...prev, status: "paused" }));
          return;
        }

        const chapter = chaptersData[chapterIndex];
        setProgress(prev => ({ ...prev, currentChapterIndex: chapterIndex }));

        // Get existing blocks for this chapter
        const { data: existingBlocks } = await supabase
          .from("blocks")
          .select("content, sort_order")
          .eq("chapter_id", chapter.id)
          .order("sort_order");

        let chapterContent = (existingBlocks || []).map(b => b.content).join("\n\n");
        let nextSortOrder = (existingBlocks?.length || 0);

        for (let sceneIndex = 0; sceneIndex < chapter.scene_outline.length; sceneIndex++) {
          if (isPausedRef.current) {
            setProgress(prev => ({ ...prev, status: "paused" }));
            return;
          }

          const scene = chapter.scene_outline[sceneIndex];
          
          // Skip if scene is null/undefined or already completed
          if (!scene) {
            console.warn(`Scene ${sceneIndex} is null/undefined in chapter ${chapter.id}`);
            continue;
          }
          
          if (scene.status === "done") {
            completedCount++;
            continue;
          }

          setProgress(prev => ({ 
            ...prev, 
            currentSceneIndex: sceneIndex,
            completedScenes: completedCount
          }));

          // Update scene status to writing
          await updateSceneStatus(chapter.id, sceneIndex, "writing");

          // Write the scene with graceful error recovery
          let sceneText = "";
          try {
            sceneText = await writeScene(
              chapter,
              sceneIndex,
              allPreviousContent + "\n\n" + chapterContent
            );
          } catch (sceneError) {
            // Graceful error recovery: ha a jelenet sikertelen, jelöljük meg és folytassuk
            console.error(`Scene ${sceneIndex} failed:`, sceneError);
            await updateSceneStatus(chapter.id, sceneIndex, "failed");
            toast.warning(`A ${sceneIndex + 1}. jelenet kihagyva. Később újrapróbálható.`, { duration: 5000 });
            // Folytatás a következő jelenettel - NE álljon le az egész könyv
            continue;
          }

          // Save as blocks
          await saveSceneAsBlocks(chapter.id, sceneText, nextSortOrder);
          nextSortOrder += sceneText.split(/\n\n+/).filter(p => p.trim()).length;

          // Update chapter word count (word usage is now tracked server-side)
          const wordCount = sceneText.split(/\s+/).filter(w => w.length > 0).length;
          await supabase
            .from("chapters")
            .update({ 
              word_count: chapter.word_count + wordCount,
            })
            .eq("id", chapter.id);

          // Update scene status to done
          await updateSceneStatus(chapter.id, sceneIndex, "done");

          chapterContent += "\n\n" + sceneText;
          completedCount++;

          setProgress(prev => ({ 
            ...prev, 
            completedScenes: completedCount,
            totalWords: prev.totalWords + wordCount
          }));

          // Notify parent
          onChapterUpdated?.(chapter.id);

          // Longer delay to avoid rate limiting (8 seconds between scenes)
          await new Promise(resolve => setTimeout(resolve, 8000));
        }

        allPreviousContent += "\n\n" + chapterContent;

        // Mark chapter as completed
        await supabase
          .from("chapters")
          .update({ generation_status: "completed", status: "done" })
          .eq("id", chapter.id);
      }

      setProgress(prev => ({ ...prev, status: "completed" }));
      toast.success("A könyv elkészült! 🎉");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setProgress(prev => ({ ...prev, status: "paused" }));
        return;
      }
      
      console.error("Auto-write error:", error);
      setProgress(prev => ({ 
        ...prev, 
        status: "error",
        error: error instanceof Error ? error.message : "Ismeretlen hiba"
      }));
      toast.error(error instanceof Error ? error.message : "Hiba az automatikus írás közben");
    } finally {
      isRunningRef.current = false;
    }
  }, [
    chapters, 
    generateAllOutlines, 
    fetchChapters, 
    projectId, 
    writeScene, 
    saveSceneAsBlocks, 
    updateSceneStatus,
    onChapterUpdated
  ]);

  const pause = useCallback(() => {
    isPausedRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setProgress(prev => ({ ...prev, status: "paused" }));
  }, []);

const resume = useCallback(async () => {
    // Frissítsük a chapters adatokat az újraindítás előtt
    await fetchChapters();
    // Kis késleltetés, hogy a state frissülhessen
    setTimeout(() => {
      startAutoWrite();
    }, 100);
  }, [fetchChapters, startAutoWrite]);

  const reset = useCallback(() => {
    isPausedRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setProgress({
      totalScenes: 0,
      completedScenes: 0,
      totalWords: 0,
      targetWords: 50000,
      currentChapterIndex: 0,
      currentSceneIndex: 0,
      status: "idle",
    });
  }, []);

  return {
    chapters,
    progress,
    startAutoWrite,
    generateAllOutlines,
    pause,
    resume,
    reset,
    fetchChapters,
  };
}
