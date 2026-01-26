import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type WritingStatus = 
  | 'idle' 
  | 'queued' 
  | 'generating_outlines' 
  | 'writing' 
  | 'in_progress'
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

  // Projekt állapot figyelése polling-gal
  useEffect(() => {
    if (!projectId) return;

    // Lekérdező függvény
    const fetchProgress = async () => {
      const { data: project, error } = await supabase
        .from("projects")
        .select("writing_status, total_scenes, completed_scenes, failed_scenes, word_count, target_word_count, writing_error, writing_started_at, writing_completed_at")
        .eq("id", projectId)
        .single();

      if (error) {
        console.error("Failed to fetch project progress:", error);
        return;
      }

      if (project) {
        setProgress({
          status: (project.writing_status as WritingStatus) || 'idle',
          totalScenes: project.total_scenes || 0,
          completedScenes: project.completed_scenes || 0,
          failedScenes: project.failed_scenes || 0,
          currentChapterIndex: 0,
          currentSceneIndex: 0,
          wordCount: project.word_count || 0,
          targetWordCount: project.target_word_count || 0,
          error: project.writing_error,
          startedAt: project.writing_started_at,
          completedAt: project.writing_completed_at,
        });
      }
    };

    // Kezdeti lekérés
    fetchProgress();

    // POLLING: 3 másodpercenként frissít
    const pollInterval = setInterval(() => {
      fetchProgress();
    }, 3000);

    // Cleanup
    return () => {
      clearInterval(pollInterval);
    };
  }, [projectId]);

  // Írás indítása - Az új start-book-writing edge function-t hívja!
  const startWriting = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    
    // Optimista UI frissítés - azonnal mutassuk, hogy elindult
    setProgress(prev => ({
      ...prev,
      status: 'queued',
      error: null,
      startedAt: new Date().toISOString(),
    }));
    
    try {
      const { data, error } = await supabase.functions.invoke('start-book-writing', {
        body: { projectId, action: 'start' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Könyvírás elindítva",
        description: "A könyv írása elkezdődött a háttérben. Bezárhatod az oldalt, az írás folytatódik.",
      });
    } catch (error) {
      console.error("Failed to start writing:", error);
      
      // Hiba esetén visszaállítjuk idle-re
      setProgress(prev => ({
        ...prev,
        status: 'idle',
        error: error instanceof Error ? error.message : "Ismeretlen hiba",
      }));
      
      toast({
        title: "Hiba",
        description: error instanceof Error ? error.message : "Nem sikerült elindítani a könyvírást.",
        variant: "destructive",
      });
      
      throw error; // Re-throw, hogy a hívó is kezelni tudja
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  // Írás folytatása
  const resumeWriting = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-book-writing', {
        body: { projectId, action: 'resume' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Könyvírás folytatva",
        description: "A könyv írása folytatódik a háttérben.",
      });
    } catch (error) {
      console.error("Failed to resume writing:", error);
      toast({
        title: "Hiba",
        description: error instanceof Error ? error.message : "Nem sikerült folytatni a könyvírást.",
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
      const { data, error } = await supabase.functions.invoke('start-book-writing', {
        body: { projectId, action: 'pause' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Könyvírás szüneteltetve",
        description: "Bármikor folytathatod az írást.",
      });
    } catch (error) {
      console.error("Failed to pause writing:", error);
      toast({
        title: "Hiba",
        description: error instanceof Error ? error.message : "Nem sikerült szüneteltetni a könyvírást.",
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
      const { data, error } = await supabase.functions.invoke('start-book-writing', {
        body: { projectId, action: 'cancel' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Könyvírás leállítva",
        description: "A könyv írása leállt.",
      });
    } catch (error) {
      console.error("Failed to cancel writing:", error);
      toast({
        title: "Hiba",
        description: error instanceof Error ? error.message : "Nem sikerült leállítani a könyvírást.",
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

  const isWriting = progress.status === 'writing' || progress.status === 'generating_outlines' || progress.status === 'queued' || progress.status === 'in_progress';
  const canStart = progress.status === 'idle' || progress.status === 'failed' || progress.status === 'in_progress';
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
