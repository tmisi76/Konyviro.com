import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Source, Citation, SourceType } from "@/types/research";

export function useSources(projectId: string) {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSources = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("project_id", projectId)
      .order("is_starred", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sources:", error);
      toast.error("Hiba a források betöltésekor");
    } else {
      setSources((data || []).map(s => ({
        ...s,
        source_type: s.source_type as SourceType,
        tags: s.tags || [],
      })));
    }
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const createSource = async (source: Partial<Source>): Promise<Source | null> => {
    const { data, error } = await supabase
      .from("sources")
      .insert({
        project_id: projectId,
        title: source.title || "Új forrás",
        author: source.author,
        publisher: source.publisher,
        year: source.year,
        url: source.url,
        source_type: source.source_type || "egyeb",
        notes: source.notes,
        tags: source.tags || [],
        is_starred: source.is_starred || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating source:", error);
      toast.error("Hiba a forrás létrehozásakor");
      return null;
    }

    const newSource = {
      ...data,
      source_type: data.source_type as SourceType,
      tags: data.tags || [],
    };
    setSources((prev) => [newSource, ...prev]);
    toast.success("Forrás hozzáadva");
    return newSource;
  };

  const updateSource = async (sourceId: string, updates: Partial<Source>) => {
    const { error } = await supabase
      .from("sources")
      .update(updates)
      .eq("id", sourceId);

    if (error) {
      console.error("Error updating source:", error);
      toast.error("Hiba a forrás módosításakor");
      return;
    }

    setSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, ...updates } : s))
    );
  };

  const deleteSource = async (sourceId: string) => {
    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("id", sourceId);

    if (error) {
      console.error("Error deleting source:", error);
      toast.error("Hiba a forrás törlésekor");
      return;
    }

    setSources((prev) => prev.filter((s) => s.id !== sourceId));
    toast.success("Forrás törölve");
  };

  const toggleStar = async (sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return;

    await updateSource(sourceId, { is_starred: !source.is_starred });
  };

  return {
    sources,
    isLoading,
    createSource,
    updateSource,
    deleteSource,
    toggleStar,
    refetch: fetchSources,
  };
}

export function useCitations(chapterId: string | null) {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCitations = useCallback(async () => {
    if (!chapterId) {
      setCitations([]);
      return;
    }
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("citations")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("citation_number", { ascending: true });

    if (error) {
      console.error("Error fetching citations:", error);
    } else {
      setCitations(data || []);
    }
    setIsLoading(false);
  }, [chapterId]);

  useEffect(() => {
    fetchCitations();
  }, [fetchCitations]);

  const createCitation = async (
    sourceId: string,
    blockId?: string,
    pageReference?: string
  ): Promise<Citation | null> => {
    if (!chapterId) return null;

    const nextNumber = citations.length + 1;

    const { data, error } = await supabase
      .from("citations")
      .insert({
        chapter_id: chapterId,
        source_id: sourceId,
        block_id: blockId || null,
        citation_number: nextNumber,
        page_reference: pageReference || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating citation:", error);
      toast.error("Hiba a hivatkozás létrehozásakor");
      return null;
    }

    setCitations((prev) => [...prev, data]);
    return data;
  };

  const deleteCitation = async (citationId: string) => {
    const { error } = await supabase
      .from("citations")
      .delete()
      .eq("id", citationId);

    if (error) {
      console.error("Error deleting citation:", error);
      return;
    }

    setCitations((prev) => prev.filter((c) => c.id !== citationId));
  };

  return {
    citations,
    isLoading,
    createCitation,
    deleteCitation,
    refetch: fetchCitations,
  };
}
