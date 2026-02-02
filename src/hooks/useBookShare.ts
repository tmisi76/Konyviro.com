import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BookShare, CreateBookShareInput, UpdateBookShareInput, SharedBookData } from "@/types/share";

// Extended type for safe share (without password_hash)
interface SafeBookShare extends Omit<BookShare, 'password_hash'> {
  requires_password: boolean;
}

export function useBookShare(projectId: string) {
  const queryClient = useQueryClient();

  // Fetch existing share for project (owner access - uses RLS)
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

  // Create share via edge function (server-side bcrypt hashing)
  const createShare = useMutation({
    mutationFn: async (input: CreateBookShareInput) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Nem vagy bejelentkezve");

      const response = await supabase.functions.invoke("create-book-share", {
        body: {
          projectId: input.project_id,
          password: input.password || null,
          isPublic: input.is_public,
          viewMode: input.view_mode,
          allowDownload: input.allow_download,
          expiresAt: input.expires_at,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data.share as SafeBookShare;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-share", projectId] });
      toast.success("Megosztási link létrehozva!");
    },
    onError: (error) => {
      toast.error("Hiba a megosztás létrehozásakor: " + error.message);
    },
  });

  // Update share via edge function (server-side bcrypt hashing)
  const updateShare = useMutation({
    mutationFn: async ({ shareId, input }: { shareId: string; input: UpdateBookShareInput }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Nem vagy bejelentkezve");

      const response = await supabase.functions.invoke("update-book-share", {
        body: {
          shareId,
          password: input.password,
          isPublic: input.is_public,
          viewMode: input.view_mode,
          allowDownload: input.allow_download,
          expiresAt: input.expires_at,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data.share as SafeBookShare;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-share", projectId] });
      toast.success("Megosztás frissítve!");
    },
    onError: (error) => {
      toast.error("Hiba a megosztás frissítésekor: " + error.message);
    },
  });

  // Delete share (uses RLS - owner can delete)
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
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    // Check for existing session in localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`share_session_${shareToken}`);
      if (stored) {
        try {
          const { token, expiresAt } = JSON.parse(stored);
          if (new Date(expiresAt) > new Date()) {
            return token;
          }
          localStorage.removeItem(`share_session_${shareToken}`);
        } catch {
          localStorage.removeItem(`share_session_${shareToken}`);
        }
      }
    }
    return null;
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["shared-book", shareToken, sessionToken],
    queryFn: async () => {
      // Use the public view that doesn't expose password_hash
      const { data: share, error: shareError } = await supabase
        .from("book_shares_public" as "book_shares")
        .select("*")
        .eq("share_token", shareToken)
        .maybeSingle();

      if (shareError) throw shareError;
      if (!share) throw new Error("Érvénytelen megosztási link");

      // Cast to include requires_password from the view
      const safeShare = share as unknown as SafeBookShare;

      // Check expiration
      if (safeShare.expires_at && new Date(safeShare.expires_at) < new Date()) {
        throw new Error("A megosztási link lejárt");
      }

      // If password required and not verified, return early with share info
      if (safeShare.requires_password && !sessionToken && !passwordVerified) {
        return {
          project: { id: "", title: "Védett könyv", description: null, genre: "" },
          chapters: [],
          share: safeShare as unknown as BookShare,
        } as SharedBookData;
      }

      // Verify session token if we have one
      if (safeShare.requires_password && sessionToken) {
        const { data: accessData, error: accessError } = await supabase
          .from("book_share_access")
          .select("expires_at")
          .eq("share_id", safeShare.id)
          .eq("session_token", sessionToken)
          .maybeSingle();

        if (accessError || !accessData || new Date(accessData.expires_at) < new Date()) {
          // Session expired or invalid
          setSessionToken(null);
          localStorage.removeItem(`share_session_${shareToken}`);
          return {
            project: { id: "", title: "Védett könyv", description: null, genre: "" },
            chapters: [],
            share: safeShare as unknown as BookShare,
          } as SharedBookData;
        }
      }

      // Increment view count via edge function or direct update
      // We can't update directly without auth, so we'll skip this for now
      // The view count could be updated by a separate edge function

      // Fetch project data
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, title, description, genre")
        .eq("id", safeShare.project_id)
        .single();

      if (projectError) throw projectError;

      // Fetch chapters
      const { data: chapters, error: chaptersError } = await supabase
        .from("chapters")
        .select("id, title, content, sort_order, word_count")
        .eq("project_id", safeShare.project_id)
        .order("sort_order");

      if (chaptersError) throw chaptersError;

      return {
        project,
        chapters: chapters || [],
        share: safeShare as unknown as BookShare,
      } as SharedBookData;
    },
    enabled: !!shareToken,
  });

  // Verify password via server-side edge function
  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke("verify-share-password", {
        body: { shareToken, password },
      });

      if (response.error) {
        console.error("Password verification error:", response.error);
        return false;
      }

      if (response.data?.error) {
        console.error("Password verification failed:", response.data.error);
        return false;
      }

      if (response.data?.verified) {
        setPasswordVerified(true);
        
        // Store session token if provided
        if (response.data.sessionToken) {
          setSessionToken(response.data.sessionToken);
          localStorage.setItem(`share_session_${shareToken}`, JSON.stringify({
            token: response.data.sessionToken,
            expiresAt: response.data.expiresAt,
          }));
        }
        
        return true;
      }

      return false;
    } catch (err) {
      console.error("Password verification exception:", err);
      return false;
    }
  };

  // Check if password is needed
  const safeShare = data?.share as unknown as SafeBookShare | undefined;
  const needsPassword = safeShare?.requires_password && !sessionToken && !passwordVerified;

  return {
    data,
    isLoading,
    error,
    needsPassword,
    passwordVerified: passwordVerified || !!sessionToken,
    verifyPassword,
  };
}
