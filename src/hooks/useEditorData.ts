import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Block, BlockType, Chapter } from "@/types/editor";
import type { TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

export function useEditorData(projectId: string) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Map<string, Partial<Block>>>(new Map());

  // Fetch chapters
  const fetchChapters = useCallback(async () => {
    const { data, error } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching chapters:", error);
      return;
    }

    setChapters(data || []);
    
    // Auto-select first chapter or create one if none exist
    if (data && data.length > 0 && !activeChapterId) {
      setActiveChapterId(data[0].id);
    } else if (!data || data.length === 0) {
      await createChapter();
    }
  }, [projectId, activeChapterId]);

  // Fetch blocks for active chapter
  const fetchBlocks = useCallback(async () => {
    if (!activeChapterId) return;

    const { data, error } = await supabase
      .from("blocks")
      .select("*")
      .eq("chapter_id", activeChapterId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching blocks:", error);
      return;
    }

    const typedData = (data || []).map(block => ({
      ...block,
      type: block.type as BlockType,
      metadata: (block.metadata || {}) as Block['metadata']
    }));

    setBlocks(typedData);
    
    // Create initial block if none exist
    if (typedData.length === 0) {
      await createBlock("paragraph", "", 0);
    }
  }, [activeChapterId]);

  // Create chapter
  const createChapter = async (title = "Új fejezet") => {
    const sortOrder = chapters.length;
    
    const { data, error } = await supabase
      .from("chapters")
      .insert({
        project_id: projectId,
        title,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating chapter:", error);
      toast.error("Hiba a fejezet létrehozásakor");
      return null;
    }

    setChapters((prev) => [...prev, data]);
    setActiveChapterId(data.id);
    return data;
  };

  // Update chapter
  const updateChapter = async (chapterId: string, updates: Partial<Chapter>) => {
    const { error } = await supabase
      .from("chapters")
      .update(updates)
      .eq("id", chapterId);

    if (error) {
      console.error("Error updating chapter:", error);
      return;
    }

    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, ...updates } : c))
    );
  };

  // Delete chapter
  const deleteChapter = async (chapterId: string) => {
    if (chapters.length <= 1) {
      toast.error("Legalább egy fejezetnek maradnia kell");
      return;
    }

    const { error } = await supabase
      .from("chapters")
      .delete()
      .eq("id", chapterId);

    if (error) {
      console.error("Error deleting chapter:", error);
      return;
    }

    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
    
    if (activeChapterId === chapterId) {
      const remaining = chapters.filter((c) => c.id !== chapterId);
      setActiveChapterId(remaining[0]?.id || null);
    }
  };

  // Create block
  const createBlock = async (
    type: BlockType = "paragraph",
    content = "",
    sortOrder?: number,
    metadata: Block['metadata'] = {}
  ) => {
    if (!activeChapterId) return null;

    const order = sortOrder ?? blocks.length;

    const insertData = {
      chapter_id: activeChapterId,
      type,
      content,
      metadata: JSON.parse(JSON.stringify(metadata)),
      sort_order: order,
    };

    const { data, error } = await supabase
      .from("blocks")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating block:", error);
      return null;
    }

    const typedBlock: Block = {
      ...data,
      type: data.type as BlockType,
      metadata: (data.metadata || {}) as Block['metadata']
    };

    setBlocks((prev) => {
      const newBlocks = [...prev, typedBlock].sort((a, b) => a.sort_order - b.sort_order);
      return newBlocks;
    });
    
    setLastSaved(new Date());
    return typedBlock;
  };

  // Update block with debounce
  const updateBlock = useCallback((blockId: string, updates: Partial<Block>) => {
    // Update local state immediately
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
    );

    // Queue the update
    pendingChangesRef.current.set(blockId, {
      ...pendingChangesRef.current.get(blockId),
      ...updates,
    });

    // Debounce the save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await flushPendingChanges();
    }, 1000);
  }, []);

  // Flush pending changes to database
  const flushPendingChanges = async () => {
    if (pendingChangesRef.current.size === 0) return;

    setIsSaving(true);

    const updates = Array.from(pendingChangesRef.current.entries());
    pendingChangesRef.current.clear();

    for (const [blockId, changes] of updates) {
      // Convert metadata to JSON-compatible type
      const dbChanges: Record<string, unknown> = { ...changes };
      if (changes.metadata) {
        dbChanges.metadata = changes.metadata as unknown as Record<string, unknown>;
      }
      
      const { error } = await supabase
        .from("blocks")
        .update(dbChanges)
        .eq("id", blockId);

      if (error) {
        console.error("Error updating block:", error);
      }
    }

    setIsSaving(false);
    setLastSaved(new Date());
  };

  // Delete block
  const deleteBlock = async (blockId: string) => {
    const { error } = await supabase.from("blocks").delete().eq("id", blockId);

    if (error) {
      console.error("Error deleting block:", error);
      return;
    }

    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setLastSaved(new Date());
  };

  // Reorder blocks
  const reorderBlocks = async (reorderedBlocks: Block[]) => {
    setBlocks(reorderedBlocks);

    const updates = reorderedBlocks.map((block, index) => ({
      id: block.id,
      sort_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from("blocks")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);
    }

    setLastSaved(new Date());
  };

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchChapters().finally(() => setIsLoading(false));
  }, [fetchChapters]);

  // Fetch blocks when active chapter changes
  useEffect(() => {
    if (activeChapterId) {
      fetchBlocks();
    }
  }, [activeChapterId, fetchBlocks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      flushPendingChanges();
    };
  }, []);

  return {
    chapters,
    blocks,
    activeChapterId,
    setActiveChapterId,
    isLoading,
    isSaving,
    lastSaved,
    createChapter,
    updateChapter,
    deleteChapter,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    flushPendingChanges,
  };
}
