import { useState, useEffect, useCallback } from "react";

interface QueuedOperation {
  id: string;
  type: "insert" | "update" | "delete";
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = "offline_queue";
const LAST_PROJECT_KEY = "last_opened_project";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load queue from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch {
        localStorage.removeItem(QUEUE_KEY);
      }
    }
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    if (queue.length > 0) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } else {
      localStorage.removeItem(QUEUE_KEY);
    }
  }, [queue]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Add operation to queue
  const addToQueue = useCallback((operation: Omit<QueuedOperation, "id" | "timestamp">) => {
    const newOp: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setQueue((prev) => [...prev, newOp]);
  }, []);

  // Clear queue after successful sync
  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem(QUEUE_KEY);
  }, []);

  // Save last opened project
  const saveLastProject = useCallback((projectId: string) => {
    localStorage.setItem(LAST_PROJECT_KEY, projectId);
  }, []);

  // Get last opened project
  const getLastProject = useCallback((): string | null => {
    return localStorage.getItem(LAST_PROJECT_KEY);
  }, []);

  return {
    isOnline,
    queue,
    isSyncing,
    setIsSyncing,
    addToQueue,
    clearQueue,
    saveLastProject,
    getLastProject,
    pendingChanges: queue.length,
  };
}
