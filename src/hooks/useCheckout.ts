import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SubscriptionTier } from "@/types/subscription";
import { toast } from "sonner";

export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);

  const createCheckoutSession = async (
    priceId: string,
    tier: SubscriptionTier
  ) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId,
          tier,
          successUrl: `${window.location.origin}/dashboard?subscription=success`,
          cancelUrl: `${window.location.origin}/pricing?subscription=cancelled`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Hiba történt a fizetés indításakor. Kérlek próbáld újra!");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createCheckoutSession,
    isLoading,
  };
}
