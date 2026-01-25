import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RetentionOffer {
  eligible: boolean;
  reason?: string;
  discountPercent?: number;
  discountDurationMonths?: number;
  currentPrice?: number;
  discountedPrice?: number;
  offerExpiresInHours?: number;
  tier?: string;
  cooldownEnds?: string;
  expiresAt?: string;
}

export function useRetentionOffer() {
  const [isLoading, setIsLoading] = useState(false);
  const [offer, setOffer] = useState<RetentionOffer | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const checkEligibility = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-retention-eligibility");
      
      if (error) throw error;
      
      setOffer(data);
      return data as RetentionOffer;
    } catch (error) {
      console.error("Error checking retention eligibility:", error);
      setOffer({ eligible: false, reason: "error" });
      return { eligible: false, reason: "error" } as RetentionOffer;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyDiscount = useCallback(async () => {
    setIsApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("apply-retention-discount");
      
      if (error) throw error;
      
      toast.success("Kedvezmény sikeresen aktiválva!");
      return { success: true, ...data };
    } catch (error) {
      console.error("Error applying retention discount:", error);
      toast.error("Hiba történt a kedvezmény alkalmazásakor");
      return { success: false, error };
    } finally {
      setIsApplying(false);
    }
  }, []);

  return {
    offer,
    isLoading,
    isApplying,
    checkEligibility,
    applyDiscount,
  };
}
