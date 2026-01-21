import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  name: string;
  price: string;
  originalPrice?: string;
  monthlyEquivalent: string;
  features: string[];
  isPopular?: boolean;
  discountBadge?: string;
  onSelect: () => void;
  isLoading?: boolean;
  isFree?: boolean;
  ctaText?: string;
}

export function PricingCard({
  name,
  price,
  originalPrice,
  monthlyEquivalent,
  features,
  isPopular = false,
  discountBadge,
  onSelect,
  isLoading = false,
  isFree = false,
  ctaText = "Lefoglalom",
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl bg-card p-6 transition-all duration-300 hover:-translate-y-1",
        isPopular
          ? "shadow-material-4 ring-2 ring-primary scale-[1.02]"
          : isFree
          ? "border-2 border-dashed border-border shadow-sm"
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
      {discountBadge && !isFree && (
        <div className="absolute -right-2 -top-2">
          <span className="inline-flex items-center rounded-lg bg-secondary px-3 py-1.5 text-sm font-bold text-secondary-foreground shadow-material-1">
            {discountBadge}
          </span>
        </div>
      )}

      {/* Plan name */}
      <h3 className="mb-4 text-xl font-bold text-foreground">{name}</h3>

      {/* Pricing */}
      <div className="mb-6">
        {originalPrice && (
          <div className="flex items-baseline gap-2">
            <span className="text-lg text-muted-foreground line-through">
              {originalPrice}
            </span>
          </div>
        )}
        <div className="mt-1">
          <span className={cn(
            "font-bold text-foreground",
            isFree ? "text-2xl" : "text-3xl"
          )}>
            {price}
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
            : isFree
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            : "bg-muted text-foreground hover:bg-muted/80"
        )}
        size="lg"
        onClick={onSelect}
        disabled={isLoading}
      >
        {isLoading ? "Feldolgozás..." : ctaText}
      </Button>
    </div>
  );
}
