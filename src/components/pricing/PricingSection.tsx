import { Shield, Clock } from "lucide-react";
import { PricingCard } from "./PricingCard";
import { ProgressBar } from "./ProgressBar";

const pricingPlans = [
  {
    name: "HOBBI",
    originalPrice: "59.880 Ft/év",
    discountedPrice: "29.940 Ft/év",
    monthlyEquivalent: "(havi 2.495 Ft)",
    features: [
      "1 projekt",
      "50.000 szó/hó",
      "Alap export formátumok",
    ],
    isPopular: false,
  },
  {
    name: "ÍRÓ",
    originalPrice: "179.880 Ft/év",
    discountedPrice: "89.940 Ft/év",
    monthlyEquivalent: "(havi 7.495 Ft)",
    features: [
      "5 projekt",
      "200.000 szó/hó",
      "Minden műfaj sablon",
      "Karakter & kutatás modul",
    ],
    isPopular: true,
  },
  {
    name: "PRO",
    originalPrice: "359.880 Ft/év",
    discountedPrice: "179.940 Ft/év",
    monthlyEquivalent: "(havi 14.995 Ft)",
    features: [
      "Korlátlan projekt",
      "Korlátlan AI generálás",
      "Minden funkció",
      "API hozzáférés",
      "Prioritásos támogatás",
    ],
    isPopular: false,
  },
];

export function PricingSection() {
  // Mock data - in real app this would come from backend
  const spotsReserved = 67;
  const totalSpots = 100;

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
            Alapító Akció
          </span>
        </div>

        {/* Headline */}
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Legyél Alapító Tag –{" "}
            <span className="text-primary">50% kedvezménnyel!</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            Február elején indulunk. Foglald le most a helyed, és{" "}
            <span className="font-semibold text-foreground">1 évig fél áron</span>{" "}
            használd a KönyvÍró AI-t.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-10">
          <ProgressBar current={spotsReserved} total={totalSpots} />
        </div>

        {/* Pricing cards */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
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
            <span>Havidíjas előfizetés hamarosan elérhető</span>
          </div>
        </div>

        {/* Urgency indicator */}
        <div className="mt-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-lg bg-warning/10 px-4 py-2 text-sm font-medium text-warning-foreground">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-warning"></span>
            Csak <span className="font-bold">{totalSpots - spotsReserved}</span> alapító hely maradt!
          </p>
        </div>
      </div>
    </section>
  );
}