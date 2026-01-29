import { useState } from "react";
import { Headphones, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AUDIOBOOK_CREDIT_PACKAGES, formatAudioMinutes } from "@/constants/audiobookCredits";

interface BuyAudiobookCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyAudiobookCreditModal({ open, onOpenChange }: BuyAudiobookCreditModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>("audiobook_100");
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-audiobook-credit-purchase", {
        body: { packageId: selectedPackage },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.open(data.url, "_blank");
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error creating purchase:", error);
      toast.error("Hiba a vásárlás indításakor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            Hangoskönyv kredit vásárlás
          </DialogTitle>
          <DialogDescription>
            Válassz egy csomagot a hangoskönyv generáláshoz. A kreditek soha nem járnak le.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {AUDIOBOOK_CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={cn(
                "relative flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all",
                selectedPackage === pkg.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2",
                    selectedPackage === pkg.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  )}
                >
                  {selectedPackage === pkg.id && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatAudioMinutes(pkg.minutes)}</span>
                    {pkg.badge && (
                      <Badge
                        variant={pkg.badge === "Legjobb ár" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {pkg.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{pkg.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {pkg.priceHuf.toLocaleString("hu-HU")} Ft
                </div>
                <div className="text-xs text-muted-foreground">
                  {pkg.pricePerMinute} Ft/perc
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Mégse
          </Button>
          <Button onClick={handlePurchase} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vásárlás
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
