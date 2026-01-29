import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProofreadingOrder {
  id: string;
  user_id: string;
  project_id: string;
  stripe_session_id: string;
  amount: number;
  word_count: number;
  status: "pending" | "paid" | "processing" | "completed" | "failed";
  current_chapter_index: number;
  total_chapters: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

// Price per word in HUF
const PRICE_PER_WORD = 0.1;
const MINIMUM_PRICE = 1990;

export function calculateProofreadingPrice(wordCount: number): number {
  const calculatedPrice = Math.round(wordCount * PRICE_PER_WORD);
  return Math.max(calculatedPrice, MINIMUM_PRICE);
}

export function useProofreading(projectId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const [realtimeOrder, setRealtimeOrder] = useState<ProofreadingOrder | null>(null);

  // Fetch current order for the project
  const { data: fetchedOrder, isLoading: orderLoading, refetch: refetchOrder } = useQuery({
    queryKey: ["proofreading-order", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proofreading_orders")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching proofreading order:", error);
        throw error;
      }

      return data as ProofreadingOrder | null;
    },
    enabled: !!projectId,
  });

  // Use realtime order if available, otherwise use fetched order
  const order = realtimeOrder || fetchedOrder;

  // Calculate word count from chapters
  const { data: wordCount = 0, isLoading: wordCountLoading } = useQuery({
    queryKey: ["project-word-count", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("word_count")
        .eq("project_id", projectId);

      if (error) throw error;

      return data?.reduce((sum, ch) => sum + (ch.word_count || 0), 0) || 0;
    },
    enabled: !!projectId,
  });

  // Get chapter count
  const { data: chapterCount = 0 } = useQuery({
    queryKey: ["project-chapter-count", projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("chapters")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!projectId,
  });

  // Realtime subscription for proofreading_orders
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`proofreading-order-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'proofreading_orders',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log("[Proofreading] Realtime update:", payload.new);
          setRealtimeOrder(payload.new as ProofreadingOrder);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proofreading_orders',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log("[Proofreading] Realtime insert:", payload.new);
          setRealtimeOrder(payload.new as ProofreadingOrder);
        }
      )
      .subscribe((status) => {
        console.log("[Proofreading] Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Polling fallback for active statuses only
  useEffect(() => {
    const isActive = order?.status === "paid" || order?.status === "processing";
    
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (isActive) {
      pollingIntervalRef.current = setInterval(() => {
        refetchOrder();
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [order?.status, refetchOrder]);

  // Handle status changes for toasts and cache invalidation
  useEffect(() => {
    if (!order) return;
    
    const currentStatus = order.status;
    const previousStatus = prevStatusRef.current;
    
    // Only react to actual status changes
    if (previousStatus !== null && previousStatus !== currentStatus) {
      if (currentStatus === "completed") {
        toast.success("A lektorálás sikeresen befejeződött!", {
          description: "A könyved szövege frissült a lektorált verzióra.",
          duration: 10000,
        });
        // Invalidate chapters to refresh editor
        queryClient.invalidateQueries({ queryKey: ["chapters", projectId] });
        queryClient.invalidateQueries({ queryKey: ["blocks"] });
      } else if (currentStatus === "failed") {
        toast.error("Hiba történt a lektorálás során", {
          description: order.error_message || "Kérjük, próbáld újra később.",
          duration: 10000,
        });
      } else if (currentStatus === "processing" && previousStatus === "paid") {
        toast.info("A lektorálás elkezdődött", {
          description: "A háttérben fut, bármikor bezárhatod az oldalt.",
        });
      }
    }
    
    prevStatusRef.current = currentStatus;
  }, [order?.status, order?.error_message, projectId, queryClient]);

  // Purchase proofreading
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-proofreading-purchase", {
        body: { projectId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (error) => {
      console.error("Purchase error:", error);
      toast.error(error instanceof Error ? error.message : "Hiba történt a vásárlás során");
    },
  });

  // Admin test proofreading (free)
  const testMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-test-proofreading", {
        body: { projectId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast.success("Lektorálás elindítva!", {
        description: "A Dashboard-on követheted az előrehaladást.",
      });
      refetchOrder();
      // Redirect to dashboard
      navigate("/dashboard");
    },
    onError: (error) => {
      console.error("Test proofreading error:", error);
      toast.error(error instanceof Error ? error.message : "Hiba történt a teszt lektorálás során");
    },
  });

  const price = calculateProofreadingPrice(wordCount);
  const progress = order ? (order.current_chapter_index / order.total_chapters) * 100 : 0;

  return {
    order,
    orderLoading,
    wordCount,
    wordCountLoading,
    chapterCount,
    price,
    progress,
    isProcessing: order?.status === "processing" || order?.status === "paid",
    isCompleted: order?.status === "completed",
    isFailed: order?.status === "failed",
    canPurchase: !order || order.status === "failed" || order.status === "completed",
    purchaseProofreading: purchaseMutation.mutate,
    isPurchasing: purchaseMutation.isPending,
    testProofreading: testMutation.mutate,
    isTesting: testMutation.isPending,
    refetchOrder,
  };
}
