import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type WritingStatus = 
  | 'idle' 
  | 'queued' 
  | 'generating_outlines' 
  | 'writing' 
  | 'paused' 
  | 'completed' 
  | 'failed';

export interface WritingProgress {
  status: WritingStatus;
  totalScenes: number;
  completedScenes: number;
  failedScenes: number;
  currentChapterIndex: number;
  currentSceneIndex: number;
  wordCount: number;
  targetWordCount: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export function useBackgroundWriter(projectId: string | null) {
  const { toast } = useToast();
  const [progress, setProgress] = useState<WritingProgress>({
    status: 'idle',
    totalScenes: 0,
    completedScenes: 0,
    failedScenes: 0,
    currentChapterIndex: 0,
    currentSceneIndex: 0,
    wordCount: 0,
    targetWordCount: 0,
    error: null,
    startedAt: null,
    completedAt: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Projekt állapot figyelése real-time
  useEffect(() => {
    if (!projectId) return;

    // Kezdeti állapot lekérése
    const fetchInitialState = async () => {
      const { data: project } = await supabase
        .from("projects")
        .select("writing_status, total_scenes, completed_scenes, failed_scenes, current_chapter_index, current_scene_index, word_count, target_word_count, writing_error, writing_started_at, writing_completed_at")
        .eq("id", projectId)
        .single();

      if (project) {
        setProgress({
          status: (project.writing_status as WritingStatus) || 'idle',
          totalScenes: project.total_scenes || 0,
          completedScenes: project.completed_scenes || 0,
          failedScenes: project.failed_scenes || 0,
          currentChapterIndex: project.current_chapter_index || 0,
          currentSceneIndex: project.current_scene_index || 0,
          wordCount: project.word_count || 0,
          targetWordCount: project.target_word_count || 0,
          error: project.writing_error,
          startedAt: project.writing_started_at,
          completedAt: project.writing_completed_at,
        });
      }
    };

    fetchInitialState();

    // Real-time subscription
    const channel = supabase
      .channel(`project-writing-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`
        },
        (payload) => {
          const project = payload.new;
          setProgress({
            status: (project.writing_status as WritingStatus) || 'idle',
            totalScenes: project.total_scenes || 0,
            completedScenes: project.completed_scenes || 0,
            failedScenes: project.failed_scenes || 0,
            currentChapterIndex: project.current_chapter_index || 0,
            currentSceneIndex: project.current_scene_index || 0,
            wordCount: project.word_count || 0,
            targetWordCount: project.target_word_count || 0,
            error: project.writing_error,
            startedAt: project.writing_started_at,
            completedAt: project.writing_completed_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Írás indítása
  const startWriting = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('book-writer-orchestrator', {
        body: { projectId, action: 'start' }
      });

      if (error) throw error;

      toast({
        title: "Könyvírás elindítva",
        description: "A könyv írása elkezdődött a háttérben. Bezárhatod az oldalt, az írás folytatódik.",
      });
    } catch (error) {
      console.error("Failed to start writing:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült elindítani a könyvírást.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  // Írás folytatása
  const resumeWriting = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('book-writer-orchestrator', {
        body: { projectId, action: 'resume' }
      });

      if (error) throw error;

      toast({
        title: "Könyvírás folytatva",
        description: "A könyv írása folytatódik a háttérben.",
      });
    } catch (error) {
      console.error("Failed to resume writing:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült folytatni a könyvírást.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  // Írás szüneteltetése
  const pauseWriting = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('book-writer-orchestrator', {
        body: { projectId, action: 'pause' }
      });

      if (error) throw error;

      toast({
        title: "Könyvírás szüneteltetve",
        description: "Bármikor folytathatod az írást.",
      });
    } catch (error) {
      console.error("Failed to pause writing:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült szüneteltetni a könyvírást.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  // Írás leállítása
  const cancelWriting = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('book-writer-orchestrator', {
        body: { projectId, action: 'cancel' }
      });

      if (error) throw error;

      toast({
        title: "Könyvírás leállítva",
        description: "A könyv írása leállt.",
      });
    } catch (error) {
      console.error("Failed to cancel writing:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült leállítani a könyvírást.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  // Számított értékek
  const progressPercent = progress.totalScenes > 0 
    ? Math.round((progress.completedScenes / progress.totalScenes) * 100) 
    : 0;

  const wordProgressPercent = progress.targetWordCount > 0
    ? Math.round((progress.wordCount / progress.targetWordCount) * 100)
    : 0;

  const isWriting = progress.status === 'writing' || progress.status === 'generating_outlines' || progress.status === 'queued';
  const canStart = progress.status === 'idle' || progress.status === 'failed';
  const canPause = isWriting;
  const canResume = progress.status === 'paused';

  return {
    progress,
    progressPercent,
    wordProgressPercent,
    isLoading,
    isWriting,
    canStart,
    canPause,
    canResume,
    startWriting,
    resumeWriting,
    pauseWriting,
    cancelWriting,
  };
}
