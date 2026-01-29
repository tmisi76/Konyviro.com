import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ActiveProofreading {
  id: string;
  project_id: string;
  project_title: string;
  status: "paid" | "processing";
  current_chapter_index: number;
  total_chapters: number;
  started_at: string | null;
}

export function useActiveProofreadings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeData, setRealtimeData] = useState<ActiveProofreading[] | null>(null);

  // Query active proofreading orders
  const { data: fetchedData, isLoading, refetch } = useQuery({
    queryKey: ["active-proofreadings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("proofreading_orders")
        .select(`
          id,
          project_id,
          status,
          current_chapter_index,
          total_chapters,
          started_at,
          projects!inner(title)
        `)
        .eq("user_id", user.id)
        .in("status", ["paid", "processing"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching active proofreadings:", error);
        throw error;
      }

      return (data || []).map((order: any) => ({
        id: order.id,
        project_id: order.project_id,
        project_title: order.projects?.title || "Ismeretlen projekt",
        status: order.status as "paid" | "processing",
        current_chapter_index: order.current_chapter_index || 0,
        total_chapters: order.total_chapters || 0,
        started_at: order.started_at,
      }));
    },
    enabled: !!user?.id,
  });

  // Realtime subscription for proofreading_orders
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`dashboard-proofreading-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proofreading_orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log("[ActiveProofreadings] Realtime update:", payload);
          // Refetch to get updated data with joined project title
          refetch();
        }
      )
      .subscribe((status) => {
        console.log("[ActiveProofreadings] Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  const activeProofreadings = realtimeData || fetchedData || [];

  return {
    activeProofreadings,
    isLoading,
    refetch,
  };
}
