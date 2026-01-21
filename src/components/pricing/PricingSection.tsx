import { Shield, Clock } from "lucide-react";
import { PricingCard } from "./PricingCard";
import { ProgressBar } from "./ProgressBar";
import { useSubscription } from "@/hooks/useSubscription";
import { useCheckout } from "@/hooks/useCheckout";
import { useAuth } from "@/contexts/AuthContext";
import { FOUNDER_PLANS } from "@/types/subscription";
import { useNavigate } from "react-router-dom";

export function PricingSection() {
  const { founderSpots, isFounderProgramOpen } = useSubscription();
  const { createCheckoutSession, isLoading } = useCheckout();
  const { user } = useAuth();
  const navigate = useNavigate();

  const spotsReserved = founderSpots?.spotsTaken ?? 0;
  const totalSpots = founderSpots?.totalSpots ?? 100;
  const programOpen = isFounderProgramOpen();

  const handlePlanSelect = (priceId: string, tier: "hobby" | "writer" | "pro") => {
    if (!user) {
      navigate("/auth?redirect=/pricing");
      return;
    }
    createCheckoutSession(priceId, tier);
  };

  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Founder badge */}
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary shadow-material-1 animate-pulse-subtle">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary"></span>
            </span>
            {programOpen ? "Alapító Akció" : "Alapító program lezárva"}
          </span>
        </div>

        {/* Headline */}
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {programOpen ? (
              <>
                Legyél Alapító Tag –{" "}
                <span className="text-primary">50% kedvezménnyel!</span>
              </>
            ) : (
              <>
                Az Alapító program{" "}
                <span className="text-primary">lezárult</span>
              </>
            )}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            {programOpen ? (
              <>
                Február elején indulunk. Foglald le most a helyed, és{" "}
                <span className="font-semibold text-foreground">1 évig fél áron</span>{" "}
                használd a KönyvÍró AI-t.
              </>
            ) : (
              "Köszönjük az érdeklődést! Hamarosan normál áron is elérhető lesz az előfizetés."
            )}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-10">
          <ProgressBar current={spotsReserved} total={totalSpots} />
        </div>

        {/* Pricing cards */}
        {programOpen && (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {FOUNDER_PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                name={plan.name}
                originalPrice={plan.originalPrice}
                discountedPrice={plan.discountedPrice}
                monthlyEquivalent={plan.monthlyEquivalent}
                features={plan.features}
                isPopular={plan.isPopular}
                onSelect={() => handlePlanSelect(plan.priceId, plan.id as "hobby" | "writer" | "pro")}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}

        {/* Trust signals */}
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-success" />
            <span>14 napos pénzvisszafizetési garancia</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-accent" />
            <span>Havidíjas előfizetés hamarosan elérhető</span>
          </div>
        </div>

        {/* Urgency indicator */}
        {programOpen && (
          <div className="mt-8 text-center">
            <p className="inline-flex items-center gap-2 rounded-lg bg-warning/10 px-4 py-2 text-sm font-medium text-warning-foreground">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-warning"></span>
              Csak <span className="font-bold">{totalSpots - spotsReserved}</span> alapító hely maradt!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
