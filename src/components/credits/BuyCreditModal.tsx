import { useState } from "react";
import { Coins, Zap, Loader2, CheckCircle } from "lucide-react";
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

interface BuyCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CREDIT_PACKAGE = {
  id: "10000",
  words: 10000,
  price: 990,
  features: [
    "10.000 extra AI szó",
    "Soha nem jár le",
    "Azonnal elérhető",
    "Bármikor felhasználható",
  ],
};

export function BuyCreditModal({ open, onOpenChange }: BuyCreditModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-credit-purchase", {
        body: { packageId: CREDIT_PACKAGE.id },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Extra Kredit Vásárlás
          </DialogTitle>
          <DialogDescription>
            Vásárolj extra szó krediteket, ha elfogyott a havi kereted.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-xl border-2 border-primary bg-primary/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {CREDIT_PACKAGE.words.toLocaleString("hu-HU")} szó
                </h3>
                <p className="text-sm text-muted-foreground">Extra kredit csomag</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {CREDIT_PACKAGE.price.toLocaleString("hu-HU")} Ft
              </div>
              <div className="text-xs text-muted-foreground">egyszeri díj</div>
            </div>
          </div>

          <ul className="mb-6 space-y-2">
            {CREDIT_PACKAGE.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {feature}
              </li>
            ))}
          </ul>

          <Button 
            onClick={handlePurchase} 
            className="w-full" 
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
                Vásárlás
              </>
            )}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Biztonságos fizetés a Stripe-on keresztül. A kredit azonnal jóváírásra kerül.
        </p>
      </DialogContent>
    </Dialog>
  );
}
