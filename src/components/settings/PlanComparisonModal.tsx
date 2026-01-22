import { useState } from "react";
import { Check, Crown, Loader2, ArrowRight, Calendar, Zap, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from "@/types/subscription";
import { useStripeSubscription } from "@/hooks/useStripeSubscription";
import { useSubscription } from "@/hooks/useSubscription";
import { useCheckout } from "@/hooks/useCheckout";

interface PlanComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Price ID mappings
const PRICE_IDS = {
  hobby: {
    monthly: "price_1Ss8bGBqXALGTPIrOVHTHBPA",
    yearly: "price_1Ss3QZBqXALGTPIr0z2uRD0a",
  },
  writer: {
    monthly: "price_1Ss8bHBqXALGTPIrEmUEe1Gw",
    yearly: "price_1Ss3QbBqXALGTPIrjbB9lSCI",
  },
  pro: {
    monthly: "price_pro_monthly",
    yearly: "price_1Ss3QcBqXALGTPIrStgzIXPu",
  },
};

const TIER_ORDER: SubscriptionTier[] = ["free", "hobby", "writer", "pro"];

export function PlanComparisonModal({ open, onOpenChange }: PlanComparisonModalProps) {
  const { subscription: stripeData, refresh } = useStripeSubscription();
  const { subscription: dbSubscription } = useSubscription();
  const { createCheckoutSession, isLoading: isCheckoutLoading } = useCheckout();
  const [isYearly, setIsYearly] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTier, setProcessingTier] = useState<string | null>(null);

  // Database is the primary source for tier (synced via Stripe webhook)
  const currentTier = dbSubscription?.tier || stripeData.tier || "free";
  const currentBillingInterval = stripeData.billingInterval;
  const visiblePlans = SUBSCRIPTION_PLANS.filter((p) => !p.isHidden);

  const getTierIndex = (tier: SubscriptionTier) => TIER_ORDER.indexOf(tier);

  // Check if switching billing period for same plan
  const isSamePlanDifferentBilling = (planId: string) => {
    return planId === currentTier && 
      currentBillingInterval !== null &&
      ((isYearly && currentBillingInterval === "month") ||
       (!isYearly && currentBillingInterval === "year"));
  };

  const handlePlanSelect = async (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    const canSwitchBilling = isSamePlanDifferentBilling(plan.id);
    if (plan.isFree || (plan.id === currentTier && !canSwitchBilling)) return;

    const tierIndex = getTierIndex(plan.id as SubscriptionTier);
    const currentIndex = getTierIndex(currentTier);
    const isUpgrade = tierIndex > currentIndex;
    const isSwitchingBillingPeriod = plan.id === currentTier;

    setIsProcessing(true);
    setProcessingTier(plan.id);

    try {
      const priceId = isYearly 
        ? PRICE_IDS[plan.id as keyof typeof PRICE_IDS]?.yearly
        : PRICE_IDS[plan.id as keyof typeof PRICE_IDS]?.monthly;

      if (!priceId) {
        throw new Error("Ez a csomag jelenleg nem elérhető");
      }

      // If user has no subscription, create checkout
      if (currentTier === "free") {
        await createCheckoutSession(priceId, plan.id as "hobby" | "writer" | "pro");
        return;
      }

      // If switching plans, use switch-subscription
      const { data, error } = await supabase.functions.invoke("switch-subscription", {
        body: { newPriceId: priceId },
      });

      if (error) throw error;

      toast.success(
        isUpgrade 
          ? "Csomag frissítve! Az új funkciók azonnal elérhetők." 
          : "Csomag módosítva! A változás a következő számlázási ciklusban lép életbe."
      );

      await refresh();
      onOpenChange(false);
    } catch (error) {
      console.error("Plan change error:", error);
      toast.error(error instanceof Error ? error.message : "Hiba történt a csomag váltásakor");
    } finally {
      setIsProcessing(false);
      setProcessingTier(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Csomagok összehasonlítása
          </DialogTitle>
          <DialogDescription>
            Válassz a csomagok közül, és frissíts vagy válts csomagot.
          </DialogDescription>
        </DialogHeader>

        {/* Billing Period Toggle */}
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="flex items-center gap-4">
            <Label 
              htmlFor="billing-period" 
              className={cn("text-sm", !isYearly && "text-foreground font-medium")}
            >
              Havi
            </Label>
            <Switch
              id="billing-period"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <div className="flex items-center gap-2">
              <Label 
                htmlFor="billing-period" 
                className={cn("text-sm", isYearly && "text-foreground font-medium")}
              >
                Éves
              </Label>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                -50%
              </Badge>
            </div>
          </div>
          {currentBillingInterval && currentTier !== "free" && (
            <p className="text-xs text-muted-foreground">
              Jelenlegi előfizetésed: {currentBillingInterval === "month" ? "havi" : "éves"}
            </p>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          {visiblePlans.map((plan) => {
            const isCurrentPlan = plan.id === currentTier;
            const tierIndex = getTierIndex(plan.id as SubscriptionTier);
            const currentIndex = getTierIndex(currentTier);
            const isUpgrade = tierIndex > currentIndex;
            const isDowngrade = tierIndex < currentIndex && !plan.isFree;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-xl border-2 p-5 transition-all",
                  isCurrentPlan
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-card hover:border-primary/50",
                  plan.isPopular && !isCurrentPlan && "sm:scale-105 sm:shadow-lg"
                )}
              >
                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Check className="mr-1 h-3 w-3" />
                      Jelenlegi csomag
                    </Badge>
                  </div>
                )}

                {/* Popular Badge */}
                {plan.isPopular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-secondary text-secondary-foreground">
                      Legnépszerűbb
                    </Badge>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-2xl font-bold text-foreground">
                    {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  {isYearly && !plan.isFree && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.monthlyEquivalent}
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {plan.projectLimit === "unlimited" ? "Korlátlan" : plan.projectLimit} projekt
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {plan.monthlyWordLimit === "unlimited" 
                        ? "Korlátlan" 
                        : `${(plan.monthlyWordLimit as number).toLocaleString("hu-HU")} szó/hó`}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="mb-4 flex-1 space-y-2">
                  {plan.features.slice(0, 4).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                {plan.isFree ? (
                  <Button variant="outline" disabled className="w-full">
                    Ingyenes
                  </Button>
                ) : isCurrentPlan && !isSamePlanDifferentBilling(plan.id) ? (
                  <Button variant="outline" disabled className="w-full">
                    Jelenlegi csomag
                  </Button>
                ) : isSamePlanDifferentBilling(plan.id) ? (
                  <Button
                    onClick={() => handlePlanSelect(plan)}
                    disabled={isProcessing || isCheckoutLoading}
                    className="w-full"
                  >
                    {processingTier === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Váltás {isYearly ? "évesre" : "havira"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePlanSelect(plan)}
                    disabled={isProcessing || isCheckoutLoading}
                    variant={isUpgrade ? "default" : "outline"}
                    className="w-full"
                  >
                    {processingTier === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {isUpgrade ? "Frissítés" : "Váltás"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Note */}
        <div className="mt-4 rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          <Calendar className="mx-auto mb-2 h-5 w-5" />
          <p>
            Frissítéskor a fennmaradó időszak arányos része jóváírásra kerül.
            <br />
            A változás azonnal életbe lép.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
