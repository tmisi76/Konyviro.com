import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RawSource } from "@/types/rawSource";

export function useRawSources(projectId: string) {
  const [rawSources, setRawSources] = useState<RawSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRawSources = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("raw_sources" as any)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching raw sources:", error);
      toast.error("Nem sikerült betölteni a forrásanyagokat");
    } else {
      setRawSources((data as unknown as RawSource[]) || []);
    }
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchRawSources();
  }, [fetchRawSources]);

  const deleteRawSource = async (id: string) => {
    const { error } = await supabase.from("raw_sources" as any).delete().eq("id", id);
    if (error) {
      toast.error("Nem sikerült törölni");
      return;
    }
    setRawSources((prev) => prev.filter((s) => s.id !== id));
    toast.success("Forrásanyag törölve");
  };

  return {
    rawSources,
    isLoading,
    refetch: fetchRawSources,
    deleteRawSource,
  };
}