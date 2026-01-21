import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionData {
  subscribed: boolean;
  tier: "free" | "hobby" | "writer" | "pro";
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cardLast4: string | null;
  cardBrand: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  invoices: Invoice[];
}

export interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
}

const defaultSubscription: SubscriptionData = {
  subscribed: false,
  tier: "free",
  subscriptionStart: null,
  subscriptionEnd: null,
  cancelAtPeriodEnd: false,
  cardLast4: null,
  cardBrand: null,
  cardExpMonth: null,
  cardExpYear: null,
  invoices: [],
};

export function useStripeSubscription() {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>(defaultSubscription);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
      setSubscription(defaultSubscription);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke("check-subscription");

      if (fnError) throw fnError;

      setSubscription({
        subscribed: data.subscribed,
        tier: data.tier || "free",
        subscriptionStart: data.subscription_start,
        subscriptionEnd: data.subscription_end,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        cardLast4: data.card_last4,
        cardBrand: data.card_brand,
        cardExpMonth: data.card_exp_month,
        cardExpYear: data.card_exp_year,
        invoices: data.invoices || [],
      });
    } catch (err) {
      console.error("Error checking subscription:", err);
      setError(err instanceof Error ? err.message : "Failed to check subscription");
    } finally {
      setIsLoading(false);
    }
  }, [user, session]);

  const openCustomerPortal = useCallback(async () => {
    if (!user || !session) {
      throw new Error("User not authenticated");
    }

    const { data, error: fnError } = await supabase.functions.invoke("customer-portal");

    if (fnError) throw fnError;

    if (data?.url) {
      window.open(data.url, "_blank");
    }
  }, [user, session]);

  // Check subscription on mount and when auth changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return {
    subscription,
    isLoading,
    error,
    refresh: checkSubscription,
    openCustomerPortal,
  };
}
