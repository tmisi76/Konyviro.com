import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SceneOutline, AutoWriteProgress, ChapterWithScenes } from "@/types/autowrite";
import type { Block } from "@/types/editor";

interface UseAutoWriteOptions {
  projectId: string;
  genre: string;
  storyStructure?: Record<string, unknown>;
  charactersContext?: string;
  bookTopic?: string;
  targetAudience?: string;
  onBlockCreated?: (chapterId: string, block: Block) => void;
  onChapterUpdated?: (chapterId: string) => void;
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
  const isPausedRef = useRef(false);

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
      completedScenes += ch.scene_outline.filter(s => s.status === "done").length;
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
      const error = await response.json();
      throw new Error(error.error || (isNonFiction ? "Szekció vázlat generálási hiba" : "Jelenet vázlat generálási hiba"));
    }

    const data = await response.json();
    return data.sceneOutline as SceneOutline[];
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

        // Build previous chapters summary
        const previousSummary = chapters
          .slice(0, i)
          .map(c => `${c.title}: ${c.scene_outline.map(s => s.description).join(". ")}`)
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

  // Write a single scene/section (genre-aware)
  const writeScene = useCallback(async (
    chapter: ChapterWithScenes,
    sceneIndex: number,
    previousContent: string
  ): Promise<string> => {
    const scene = chapter.scene_outline[sceneIndex];
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || (isNonFiction ? "Szekció írási hiba" : "Jelenet írási hiba"));
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullText += content;
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    return fullText;
  }, [projectId, charactersContext, storyStructure, genre, isNonFiction, bookTopic, targetAudience]);

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
          
          // Skip completed scenes
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

          // Write the scene
          const sceneText = await writeScene(
            chapter,
            sceneIndex,
            allPreviousContent + "\n\n" + chapterContent
          );

          // Save as blocks
          await saveSceneAsBlocks(chapter.id, sceneText, nextSortOrder);
          nextSortOrder += sceneText.split(/\n\n+/).filter(p => p.trim()).length;

          // Update chapter word count
          const wordCount = sceneText.split(/\s+/).length;
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

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
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

  const resume = useCallback(() => {
    startAutoWrite();
  }, [startAutoWrite]);

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
