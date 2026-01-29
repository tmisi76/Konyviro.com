import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [isPolling, setIsPolling] = useState(false);

  // Fetch current order for the project
  const { data: order, isLoading: orderLoading, refetch: refetchOrder } = useQuery({
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

  // Poll for order status updates when processing
  useEffect(() => {
    if (!order) return;

    const shouldPoll = order.status === "paid" || order.status === "processing";
    
    if (shouldPoll && !isPolling) {
      setIsPolling(true);
      
      const interval = setInterval(() => {
        refetchOrder();
      }, 3000); // Poll every 3 seconds

      return () => {
        clearInterval(interval);
        setIsPolling(false);
      };
    } else if (!shouldPoll && isPolling) {
      setIsPolling(false);
    }
  }, [order?.status, isPolling, refetchOrder]);

  // Show toast when order completes
  useEffect(() => {
    if (order?.status === "completed") {
      toast.success("A lektorálás sikeresen befejeződött!", {
        description: "A könyved szövege frissült a lektorált verzióra.",
        duration: 10000,
      });
      // Invalidate chapters to refresh editor
      queryClient.invalidateQueries({ queryKey: ["chapters", projectId] });
      queryClient.invalidateQueries({ queryKey: ["blocks"] });
    } else if (order?.status === "failed") {
      toast.error("Hiba történt a lektorálás során", {
        description: order.error_message || "Kérjük, próbáld újra később.",
        duration: 10000,
      });
    }
  }, [order?.status, order?.error_message, projectId, queryClient]);

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
    refetchOrder,
  };
}
