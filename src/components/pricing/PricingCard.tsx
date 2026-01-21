import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  name: string;
  originalPrice: string;
  discountedPrice: string;
  monthlyEquivalent: string;
  features: string[];
  isPopular?: boolean;
  discountBadge?: string;
}

export function PricingCard({
  name,
  originalPrice,
  discountedPrice,
  monthlyEquivalent,
  features,
  isPopular = false,
  discountBadge = "-50%",
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl bg-card p-6 transition-all duration-300 hover:-translate-y-1",
        isPopular
          ? "shadow-material-4 ring-2 ring-primary scale-[1.02]"
          : "shadow-material-2 hover:shadow-material-3"
      )}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-material-1">
            Legnépszerűbb
          </span>
        </div>
      )}

      {/* Discount badge */}
      <div className="absolute -right-2 -top-2">
        <span className="inline-flex items-center rounded-lg bg-secondary px-3 py-1.5 text-sm font-bold text-secondary-foreground shadow-material-1">
          {discountBadge}
        </span>
      </div>

      {/* Plan name */}
      <h3 className="mb-4 text-xl font-bold text-foreground">{name}</h3>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-lg text-muted-foreground line-through">
            {originalPrice}
          </span>
        </div>
        <div className="mt-1">
          <span className="text-3xl font-bold text-foreground">
            {discountedPrice}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{monthlyEquivalent}</p>
      </div>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
              <Check className="h-3 w-3 text-success" />
            </div>
            <span className="text-sm text-card-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Button
        className={cn(
          "w-full font-semibold transition-all duration-200",
          isPopular
            ? "bg-primary hover:bg-primary/90 shadow-material-1 hover:shadow-material-2"
            : "bg-muted text-foreground hover:bg-muted/80"
        )}
        size="lg"
      >
        Lefoglalom
      </Button>
    </div>
  );
}