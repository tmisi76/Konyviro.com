import { useState } from "react";
import { Coins, Zap, Loader2, CheckCircle, Sparkles, Star } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface BuyCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreditPackage {
  id: string;
  words: number;
  price: number;
  pricePerWord: number;
  popular?: boolean;
  bestValue?: boolean;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "25000",
    words: 25000,
    price: 1990,
    pricePerWord: 1990 / 25000,
  },
  {
    id: "50000",
    words: 50000,
    price: 3490,
    pricePerWord: 3490 / 50000,
    popular: true,
  },
  {
    id: "100000",
    words: 100000,
    price: 5990,
    pricePerWord: 5990 / 100000,
    bestValue: true,
  },
];

const COMMON_FEATURES = [
  "Soha nem jár le",
  "Azonnal elérhető",
  "Bármikor felhasználható",
];

export function BuyCreditModal({ open, onOpenChange }: BuyCreditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>("50000");

  const handlePurchase = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-credit-purchase", {
        body: { packageId: selectedPackage },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Hiba történt a vásárlás indításakor");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("hu-HU");
  };

  const formatWords = (words: number) => {
    return (words / 1000).toLocaleString("hu-HU") + "k";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Extra Kredit Vásárlás
          </DialogTitle>
          <DialogDescription>
            Válassz a kredit csomagok közül. Minél többet veszel, annál jobban megéri!
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={cn(
                "relative flex flex-col rounded-xl border-2 p-4 text-left transition-all hover:border-primary/50",
                selectedPackage === pkg.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card",
                pkg.popular && "sm:scale-105 sm:shadow-lg",
                pkg.bestValue && "border-amber-500/50"
              )}
            >
              {/* Badge */}
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Star className="h-3 w-3" />
                    Népszerű
                  </span>
                </div>
              )}
              {pkg.bestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                    <Sparkles className="h-3 w-3" />
                    Legjobb ár
                  </span>
                </div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  "mb-3 flex h-10 w-10 items-center justify-center rounded-full",
                  selectedPackage === pkg.id ? "bg-primary/20" : "bg-muted"
                )}
              >
                <Zap
                  className={cn(
                    "h-5 w-5",
                    selectedPackage === pkg.id ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>

              {/* Words */}
              <h3 className="text-xl font-bold text-foreground">
                {formatWords(pkg.words)} szó
              </h3>

              {/* Price */}
              <div className="mt-2">
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(pkg.price)} Ft
                </span>
              </div>

              {/* Price per word */}
              <p className="mt-1 text-xs text-muted-foreground">
                {(pkg.pricePerWord * 1000).toFixed(2)} Ft / 1000 szó
              </p>

              {/* Savings indicator */}
              {pkg.bestValue && (
                <div className="mt-2 rounded bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  40% megtakarítás
                </div>
              )}
              {pkg.popular && !pkg.bestValue && (
                <div className="mt-2 rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  25% megtakarítás
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Features */}
        <div className="mt-4 rounded-lg bg-muted/50 p-4">
          <h4 className="mb-2 text-sm font-medium text-foreground">
            Minden csomagra érvényes:
          </h4>
          <ul className="grid gap-2 sm:grid-cols-3">
            {COMMON_FEATURES.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Purchase button */}
        <Button 
          onClick={handlePurchase} 
          className="mt-4 w-full" 
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Feldolgozás...
            </>
          ) : (
            <>
              <Coins className="mr-2 h-4 w-4" />
              Vásárlás -{" "}
              {formatPrice(
                CREDIT_PACKAGES.find((p) => p.id === selectedPackage)?.price || 0
              )}{" "}
              Ft
            </>
          )}
        </Button>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Biztonságos fizetés a Stripe-on keresztül. A kredit azonnal jóváírásra kerül.
        </p>
      </DialogContent>
    </Dialog>
  );
}
