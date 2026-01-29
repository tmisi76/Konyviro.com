import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BookShare, CreateBookShareInput, UpdateBookShareInput, SharedBookData } from "@/types/share";

// Generate a secure random token
function generateShareToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Simple hash function for password (in production, use bcrypt in edge function)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useBookShare(projectId: string) {
  const queryClient = useQueryClient();

  // Fetch existing share for project
  const { data: share, isLoading } = useQuery({
    queryKey: ["book-share", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_shares")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;
      return data as BookShare | null;
    },
    enabled: !!projectId,
  });

  // Create share
  const createShare = useMutation({
    mutationFn: async (input: CreateBookShareInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nem vagy bejelentkezve");

      const shareToken = generateShareToken();
      const passwordHash = input.password ? await hashPassword(input.password) : null;

      const { data, error } = await supabase
        .from("book_shares")
        .insert({
          project_id: input.project_id,
          user_id: user.id,
          share_token: shareToken,
          is_public: input.is_public,
          password_hash: passwordHash,
          view_mode: input.view_mode,
          allow_download: input.allow_download,
          expires_at: input.expires_at,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BookShare;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-share", projectId] });
      toast.success("Megosztási link létrehozva!");
    },
    onError: (error) => {
      toast.error("Hiba a megosztás létrehozásakor: " + error.message);
    },
  });

  // Update share
  const updateShare = useMutation({
    mutationFn: async ({ shareId, input }: { shareId: string; input: UpdateBookShareInput }) => {
      const updateData: Record<string, unknown> = {
        ...input,
        updated_at: new Date().toISOString(),
      };

      // Handle password update
      if (input.password !== undefined) {
        updateData.password_hash = input.password ? await hashPassword(input.password) : null;
        delete updateData.password;
      }

      const { data, error } = await supabase
        .from("book_shares")
        .update(updateData)
        .eq("id", shareId)
        .select()
        .single();

      if (error) throw error;
      return data as BookShare;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-share", projectId] });
      toast.success("Megosztás frissítve!");
    },
    onError: (error) => {
      toast.error("Hiba a megosztás frissítésekor: " + error.message);
    },
  });

  // Delete share
  const deleteShare = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from("book_shares")
        .delete()
        .eq("id", shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-share", projectId] });
      toast.success("Megosztás törölve!");
    },
    onError: (error) => {
      toast.error("Hiba a megosztás törlésekor: " + error.message);
    },
  });

  // Generate share URL
  const getShareUrl = (token: string) => {
    return `${window.location.origin}/read/${token}`;
  };

  return {
    share,
    isLoading,
    createShare,
    updateShare,
    deleteShare,
    getShareUrl,
  };
}

// Hook for public reader - fetch shared book by token
export function useSharedBook(shareToken: string) {
  const [passwordVerified, setPasswordVerified] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["shared-book", shareToken],
    queryFn: async () => {
      // First get the share info
      const { data: share, error: shareError } = await supabase
        .from("book_shares")
        .select("*")
        .eq("share_token", shareToken)
        .maybeSingle();

      if (shareError) throw shareError;
      if (!share) throw new Error("Érvénytelen megosztási link");

      // Check expiration
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        throw new Error("A megosztási link lejárt");
      }

      // Increment view count
      await supabase
        .from("book_shares")
        .update({ view_count: (share.view_count || 0) + 1 })
        .eq("id", share.id);

      // Fetch project data
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, title, description, genre")
        .eq("id", share.project_id)
        .single();

      if (projectError) throw projectError;

      // Fetch chapters
      const { data: chapters, error: chaptersError } = await supabase
        .from("chapters")
        .select("id, title, content, sort_order, word_count")
        .eq("project_id", share.project_id)
        .order("sort_order");

      if (chaptersError) throw chaptersError;

      return {
        project,
        chapters: chapters || [],
        share: share as BookShare,
      } as SharedBookData;
    },
    enabled: !!shareToken,
  });

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!data?.share.password_hash) return true;
    
    const hash = await hashPassword(password);
    const isValid = hash === data.share.password_hash;
    if (isValid) setPasswordVerified(true);
    return isValid;
  };

  const needsPassword = data?.share && !data.share.is_public && data.share.password_hash && !passwordVerified;

  return {
    data,
    isLoading,
    error,
    needsPassword,
    passwordVerified,
    verifyPassword,
  };
}
