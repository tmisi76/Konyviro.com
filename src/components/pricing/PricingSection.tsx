import { useState } from "react";
import { Shield, Clock } from "lucide-react";
import { PricingCard } from "./PricingCard";
import { useCheckout } from "@/hooks/useCheckout";
import { SUBSCRIPTION_PLANS, type BillingPeriod } from "@/types/subscription";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function PricingSection() {
  const { createCheckoutSession, isLoading } = useCheckout();
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("yearly");

  // Filter out hidden plans (free, internal pro)
  const visiblePlans = SUBSCRIPTION_PLANS.filter(p => !p.isHidden);
  const paidPlans = visiblePlans.filter(p => !p.isFree);

  const handlePlanSelect = (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    // Free plan - just go to auth
    if (plan.isFree) {
      navigate("/auth?mode=register");
      return;
    }

    // Paid plans - direct Stripe checkout (guest or authenticated)
    const priceId = billingPeriod === "yearly" ? plan.yearlyPriceId : plan.monthlyPriceId;
    if (priceId) {
      createCheckoutSession(priceId, plan.id as "hobby" | "writer" | "agency" | "pro", billingPeriod);
    }
  };

  return (
    <section id="pricing" className="relative overflow-hidden py-20 sm:py-28">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Válaszd ki a{" "}
            <span className="text-primary">megfelelő csomagot</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            Az éves előfizetéssel jelentős kedvezményt kapsz
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <Label 
            htmlFor="billing-toggle" 
            className={`cursor-pointer text-sm font-medium transition-colors ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
          >
            Havi
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingPeriod === "yearly"}
            onCheckedChange={(checked) => setBillingPeriod(checked ? "yearly" : "monthly")}
          />
          <Label 
            htmlFor="billing-toggle" 
            className={`cursor-pointer text-sm font-medium transition-colors ${billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
          >
            Éves
            <span className="ml-2 rounded-full bg-secondary/20 px-2 py-0.5 text-xs font-bold text-secondary">
              50% kedvezmény
            </span>
          </Label>
        </div>


        {/* Pricing cards */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {/* Paid plans */}
          {paidPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              name={plan.name}
              price={billingPeriod === "yearly" ? plan.yearlyPrice : plan.monthlyPrice}
              originalPrice=""
              monthlyEquivalent={billingPeriod === "yearly" ? plan.monthlyEquivalent : plan.description}
              features={plan.features}
              isPopular={plan.isPopular}
              onSelect={() => handlePlanSelect(plan)}
              isLoading={isLoading}
              ctaText="Hét napig ingyenesen kipróbálom"
            />
          ))}
        </div>

        {/* Trust signals */}
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-success" />
            <span>14 napos pénzvisszafizetési garancia</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-accent" />
            <span>Bármikor lemondható</span>
          </div>
        </div>

      </div>
    </section>
  );
}
