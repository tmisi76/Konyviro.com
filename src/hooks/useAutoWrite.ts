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

// Client-side timeout (longer than edge function timeout to account for network latency)
const CLIENT_TIMEOUT = 150000; // 2.5 minutes

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
    failedScenes: 0,
    skippedScenes: 0,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const { user } = useAuth();
  const isPausedRef = useRef(false);
  const isRunningRef = useRef(false);
  const sceneStartTimeRef = useRef<number>(0);
  const sceneDurationsRef = useRef<number[]>([]);

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

    // Calculate progress including failed and skipped
    let totalScenes = 0;
    let completedScenes = 0;
    let failedScenes = 0;
    let skippedScenes = 0;
    let totalWords = 0;

    chaptersWithScenes.forEach(ch => {
      ch.scene_outline.forEach(s => {
        if (!s) return;
        totalScenes++;
        if (s.status === "done") completedScenes++;
        if (s.status === "failed") failedScenes++;
        if (s.status === "skipped") skippedScenes++;
      });
      totalWords += ch.word_count;
    });

    setProgress(prev => ({
      ...prev,
      totalScenes,
      completedScenes,
      totalWords,
      failedScenes,
      skippedScenes,
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

    // Client-side timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse outline response JSON:", parseError);
        throw new Error("Vázlat válasz feldolgozási hiba");
      }
      
      // Filter out null/undefined scenes from the outline
      const sceneOutline = (data.sceneOutline as SceneOutline[]) || [];
      return sceneOutline.filter(s => s != null);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Időtúllépés a vázlat generálása közben");
      }
      throw error;
    }
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

        setProgress(prev => ({ 
          ...prev, 
          currentChapterIndex: i,
          currentChapterTitle: chapter.title,
        }));

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

        try {
          await generateOutlineForChapter(chapter, previousSummary, nextChapterTitle);
        } catch (outlineError) {
          console.error(`Outline generation failed for chapter ${chapter.title}:`, outlineError);
          // Continue with next chapter instead of stopping - popup shows progress
          continue;
        }
        
        await fetchChapters();
      }

      setProgress(prev => ({ ...prev, status: "idle" }));
      console.log("All outlines generated successfully");
    } catch (error) {
      console.error("Outline generation error:", error);
      setProgress(prev => ({ 
        ...prev, 
        status: "error",
        error: error instanceof Error ? error.message : "Ismeretlen hiba"
      }));
      // Error state shown in modal, no toast needed
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
    const MAX_DELAY = 120000; // Maximum 2 minutes
    
    const scene = chapter.scene_outline[sceneIndex];
    
    if (!scene) {
      throw new Error(`Jelenet ${sceneIndex + 1} nem található a fejezetben`);
    }
    const { data: { session } } = await supabase.auth.getSession();

    abortControllerRef.current = new AbortController();
    
    // Client-side timeout
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, CLIENT_TIMEOUT);

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

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting with exponential backoff + max delay
      if (response.status === 429) {
        if (retryCount >= MAX_RETRIES) {
          throw new Error("Túl sok próbálkozás után sem sikerült. Kérlek próbáld újra később.");
        }
        
        const delay = Math.min(BASE_DELAY * Math.pow(2, retryCount), MAX_DELAY);
        console.log(`Rate limited. Retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        toast.info(`AI válaszra várakozás... ${Math.ceil(delay / 1000)} másodperc`, { duration: delay });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return writeScene(chapter, sceneIndex, previousContent, retryCount + 1);
      }
      
      // Handle transient server errors with retry
      if (response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) {
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
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse scene response JSON:", parseError);
        if (retryCount < MAX_RETRIES) {
          const delay = Math.min(BASE_DELAY * Math.pow(1.5, retryCount), MAX_DELAY);
          console.log(`JSON parse error. Retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return writeScene(chapter, sceneIndex, previousContent, retryCount + 1);
        }
        throw new Error("Jelenet válasz feldolgozási hiba");
      }
      
      const fullText = data.content || "";
      
      // Check minimum length
      if (fullText.length < 100) {
        if (retryCount < MAX_RETRIES) {
          const delay = Math.min(BASE_DELAY * Math.pow(1.5, retryCount), MAX_DELAY);
          console.log(`Response too short (${fullText.length} chars). Retrying in ${delay / 1000}s`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return writeScene(chapter, sceneIndex, previousContent, retryCount + 1);
        }
        throw new Error("Az AI válasz túl rövid volt");
      }
      
      // Word count is now tracked server-side, no need to track here
      console.log(`Scene written: ${data.wordCount || 0} words (tracked server-side)`);
      
      // Notify streaming update for preview
      if (fullText && onStreamingUpdate) {
        // Simulated streaming effect: gradually display the text
        const words = fullText.split(/\s+/);
        let displayed = "";
        for (let i = 0; i < words.length; i += 5) {
          displayed = words.slice(0, i + 5).join(" ");
          onStreamingUpdate(displayed);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      return fullText;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === "AbortError") {
        // Check if this was a timeout
        if (retryCount < MAX_RETRIES) {
          const delay = Math.min(BASE_DELAY * Math.pow(1.5, retryCount), MAX_DELAY);
          console.log(`Timeout. Retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          toast.info(`Időtúllépés, újrapróbálás...`, { duration: delay });
          await new Promise(resolve => setTimeout(resolve, delay));
          return writeScene(chapter, sceneIndex, previousContent, retryCount + 1);
        }
        throw new Error("Időtúllépés a jelenet írása közben");
      }
      throw error;
    }
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
    if (updatedOutline[sceneIndex]) {
      updatedOutline[sceneIndex] = { ...updatedOutline[sceneIndex], status };
    }

    await supabase
      .from("chapters")
      .update({ scene_outline: JSON.parse(JSON.stringify(updatedOutline)) })
      .eq("id", chapterId);
  }, [chapters]);

  // Restart failed and skipped scenes
  const restartFailedScenes = useCallback(async () => {
    if (isRunningRef.current) return;
    
    toast.info("Hibás jelenetek újraindítása...");
    
    // Fetch all chapters
    const { data: allChapters } = await supabase
      .from("chapters")
      .select("id, scene_outline")
      .eq("project_id", projectId);
    
    if (!allChapters) return;
    
    let resetCount = 0;
    
    // Reset failed/skipped scenes to pending
    for (const chapter of allChapters) {
      const scenes = (chapter.scene_outline as unknown as SceneOutline[]) || [];
      const hasFailedScenes = scenes.some(s => 
        s && (s.status === "failed" || s.status === "skipped")
      );
      
      if (hasFailedScenes) {
        const fixedScenes = scenes.map(s => {
          if (!s) return s;
          if (s.status === "failed" || s.status === "skipped") {
            resetCount++;
            return { ...s, status: "pending" as const };
          }
          return s;
        });
        
        await supabase
          .from("chapters")
          .update({ 
            scene_outline: JSON.parse(JSON.stringify(fixedScenes)),
            generation_status: "pending"
          })
          .eq("id", chapter.id);
      }
    }
    
    if (resetCount > 0) {
      toast.success(`${resetCount} jelenet visszaállítva`);
      await fetchChapters();
      // Small delay then restart
      setTimeout(() => {
        startAutoWrite();
      }, 500);
    } else {
      toast.info("Nincs újragenerálandó jelenet");
    }
  }, [projectId, fetchChapters]);

  // Main auto-write function
  const startAutoWrite = useCallback(async () => {
    // Prevent accidental parallel runs (double-click retry / resume while already running).
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    setProgress(prev => ({ 
      ...prev, 
      status: "writing",
      startTime: Date.now(),
      failedScenes: 0,
      skippedScenes: 0,
    }));
    isPausedRef.current = false;
    sceneDurationsRef.current = [];

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
      let failedCount = 0;
      let skippedCount = 0;

      for (let chapterIndex = 0; chapterIndex < chaptersData.length; chapterIndex++) {
        if (isPausedRef.current) {
          setProgress(prev => ({ ...prev, status: "paused" }));
          return;
        }

        const chapter = chaptersData[chapterIndex];
        setProgress(prev => ({ 
          ...prev, 
          currentChapterIndex: chapterIndex,
          currentChapterTitle: chapter.title,
        }));

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
          
          // Skip if scene is null/undefined
          if (!scene) {
            console.warn(`Scene ${sceneIndex} is null/undefined in chapter ${chapter.id}`);
            skippedCount++;
            continue;
          }
          
          // Skip if already completed, failed, or skipped
          if (scene.status === "done") {
            completedCount++;
            continue;
          }
          
          if (scene.status === "skipped" || scene.status === "failed") {
            if (scene.status === "skipped") skippedCount++;
            if (scene.status === "failed") failedCount++;
            continue;
          }

          // Calculate average time per scene
          const avgSeconds = sceneDurationsRef.current.length > 0
            ? sceneDurationsRef.current.reduce((a, b) => a + b, 0) / sceneDurationsRef.current.length
            : 45;
          const remainingScenes = progress.totalScenes - completedCount - failedCount - skippedCount;
          
          setProgress(prev => ({ 
            ...prev, 
            currentSceneIndex: sceneIndex,
            currentSceneTitle: scene.title,
            completedScenes: completedCount,
            failedScenes: failedCount,
            skippedScenes: skippedCount,
            avgSecondsPerScene: avgSeconds,
            estimatedRemainingSeconds: Math.round(remainingScenes * avgSeconds),
          }));

          // Update scene status to writing
          await updateSceneStatus(chapter.id, sceneIndex, "writing");

          // Track scene duration
          sceneStartTimeRef.current = Date.now();

          // Write the scene with graceful error recovery
          let sceneText = "";
          try {
            sceneText = await writeScene(
              chapter,
              sceneIndex,
              allPreviousContent + "\n\n" + chapterContent
            );
          } catch (sceneError) {
            // Graceful error recovery: mark failed and continue
            console.error(`Scene ${sceneIndex} failed:`, sceneError);
            await updateSceneStatus(chapter.id, sceneIndex, "failed");
            failedCount++;
            // Progress tracked in modal, continue with next scene
            continue;
          }

          // Record scene duration
          const sceneDuration = (Date.now() - sceneStartTimeRef.current) / 1000;
          sceneDurationsRef.current.push(sceneDuration);
          // Keep only last 10 durations for rolling average
          if (sceneDurationsRef.current.length > 10) {
            sceneDurationsRef.current.shift();
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
            totalWords: prev.totalWords + wordCount,
            failedScenes: failedCount,
            skippedScenes: skippedCount,
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

      setProgress(prev => ({ 
        ...prev, 
        status: "completed",
        failedScenes: failedCount,
        skippedScenes: skippedCount,
      }));
      
      // Completion is shown in modal with celebration, no toast needed
      console.log(`Book completed! Failed: ${failedCount}, Skipped: ${skippedCount}`);
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
      // Error state shown in modal, no toast needed
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
    onChapterUpdated,
    progress.totalScenes
  ]);

  const pause = useCallback(() => {
    isPausedRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setProgress(prev => ({ ...prev, status: "paused" }));
  }, []);

  const resume = useCallback(async () => {
    // Refresh chapters data before restart
    await fetchChapters();
    // Small delay to let state update
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
      failedScenes: 0,
      skippedScenes: 0,
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
    restartFailedScenes,
  };
}
