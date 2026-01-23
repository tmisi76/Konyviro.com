import { useEffect, useCallback } from "react";

const STORAGE_KEY = "autowrite_progress";

export interface PersistedWritingState {
  projectId: string;
  status: string;
  currentChapterIndex: number;
  completedScenes: number;
  totalScenes: number;
  totalWords: number;
  timestamp: number;
}

export function useWritingPersistence(projectId: string) {
  // Mentés localStorage-ba
  const saveProgress = useCallback((state: Omit<PersistedWritingState, "projectId" | "timestamp">) => {
    if (!projectId) return;
    
    const persistedState: PersistedWritingState = {
      ...state,
      projectId,
      timestamp: Date.now(),
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    } catch (e) {
      console.warn("Failed to save writing progress to localStorage:", e);
    }
  }, [projectId]);

  // Betöltés localStorage-ból
  const loadProgress = useCallback((): PersistedWritingState | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const parsed: PersistedWritingState = JSON.parse(stored);
      
      // Ellenőrizzük, hogy ugyanahhoz a projekthez tartozik-e
      if (parsed.projectId !== projectId) return null;
      
      // Ha 24 óránál régebbi, töröljük
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 óra
      if (Date.now() - parsed.timestamp > MAX_AGE) {
        clearProgress();
        return null;
      }
      
      return parsed;
    } catch (e) {
      console.warn("Failed to load writing progress from localStorage:", e);
      return null;
    }
  }, [projectId]);

  // Törlés
  const clearProgress = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear writing progress from localStorage:", e);
    }
  }, []);

  // Ellenőrzi, hogy van-e mentett állapot ehhez a projekthez
  const hasSavedProgress = useCallback((): boolean => {
    const saved = loadProgress();
    return saved !== null && saved.status !== "completed";
  }, [loadProgress]);

  return {
    saveProgress,
    loadProgress,
    clearProgress,
    hasSavedProgress,
  };
}
