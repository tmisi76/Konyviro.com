import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ChapterVersion {
  id: string;
  chapter_id: string;
  content: string | null;
  word_count: number;
  trigger_type: string;
  created_by: string | null;
  created_at: string;
}

export function useChapterVersions(chapterId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["chapter-versions", chapterId],
    queryFn: async () => {
      if (!chapterId) return [];
      const { data, error } = await supabase
        .from("chapter_versions")
        .select("*")
        .eq("chapter_id", chapterId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ChapterVersion[];
    },
    enabled: !!chapterId,
  });

  const createSnapshot = useMutation({
    mutationFn: async ({
      chapterId,
      content,
      wordCount,
      triggerType = "manual",
    }: {
      chapterId: string;
      content: string;
      wordCount: number;
      triggerType?: string;
    }) => {
      const { data, error } = await supabase
        .from("chapter_versions")
        .insert({
          chapter_id: chapterId,
          content,
          word_count: wordCount,
          trigger_type: triggerType,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-versions", chapterId] });
    },
  });

  const restoreVersion = useMutation({
    mutationFn: async (versionId: string) => {
      const version = versions.find((v) => v.id === versionId);
      if (!version || !version.content || !chapterId) throw new Error("Version not found");

      // Save current state as auto snapshot first
      const { data: currentChapter } = await supabase
        .from("chapters")
        .select("content, word_count")
        .eq("id", chapterId)
        .single();

      if (currentChapter?.content) {
        await supabase.from("chapter_versions").insert({
          chapter_id: chapterId,
          content: currentChapter.content,
          word_count: currentChapter.word_count || 0,
          trigger_type: "auto_before_restore",
          created_by: user?.id,
        });
      }

      // Restore the version content to the chapter
      const { error } = await supabase
        .from("chapters")
        .update({
          content: version.content,
          word_count: version.word_count,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chapterId);
      if (error) throw error;

      // Also update blocks if they exist
      const { data: blocks } = await supabase
        .from("blocks")
        .select("id")
        .eq("chapter_id", chapterId)
        .order("sort_order")
        .limit(1);

      if (blocks && blocks.length > 0) {
        await supabase
          .from("blocks")
          .update({ content: version.content })
          .eq("id", blocks[0].id);
      }

      return version;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-versions", chapterId] });
      toast.success("Verzió visszaállítva!");
    },
    onError: () => {
      toast.error("Hiba a verzió visszaállításakor");
    },
  });

  return {
    versions,
    isLoading,
    createSnapshot: createSnapshot.mutateAsync,
    restoreVersion: restoreVersion.mutateAsync,
    isRestoring: restoreVersion.isPending,
  };
}
