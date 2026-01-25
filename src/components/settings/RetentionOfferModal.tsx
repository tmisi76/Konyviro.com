import { useState, useEffect, forwardRef } from "react";
import { Gift, Clock, Heart, AlertTriangle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRetentionOffer } from "@/hooks/useRetentionOffer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TIER_NAMES: Record<string, string> = {
  hobby: "Hobbi",
  writer: "Író",
  pro: "Pro",
};

const CANCELLATION_REASONS = [
  { value: "too_expensive", label: "Túl drága számomra" },
  { value: "not_using", label: "Nem használom eleget" },
  { value: "quality", label: "Nem elégedett a minőséggel" },
  { value: "switching", label: "Másik szolgáltatásra váltok" },
  { value: "other", label: "Egyéb ok" },
];

interface RetentionOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionEnd?: string | null;
  onSuccess: () => void;
}

type Step = "loading" | "offer" | "feedback" | "confirming";

export const RetentionOfferModal = forwardRef<HTMLDivElement, RetentionOfferModalProps>(
  function RetentionOfferModal({ open, onOpenChange, subscriptionEnd, onSuccess }, ref) {
  const [step, setStep] = useState<Step>("loading");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [feedbackText, setFeedbackText] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const { offer, isLoading, isApplying, checkEligibility, applyDiscount } = useRetentionOffer();

  useEffect(() => {
    if (open) {
      setStep("loading");
      setSelectedReason("");
      setFeedbackText("");
      checkEligibility().then((result) => {
        if (result?.eligible) {
          setStep("offer");
        } else {
          setStep("feedback");
        }
      });
    }
  }, [open, checkEligibility]);

  const handleAcceptOffer = async () => {
    const result = await applyDiscount();
    if (result.success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleDeclineOffer = () => {
    setStep("feedback");
  };

  const handleCancel = async () => {
    if (!selectedReason) {
      toast.error("Kérlek válassz egy okot a lemondáshoz");
      return;
    }

    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: {
          cancelImmediately: false,
          cancellationReason: selectedReason,
          cancellationFeedback: feedbackText,
        },
      });

      if (error) throw error;

      toast.success("Az előfizetésed a jelenlegi időszak végén lejár.");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error("Hiba történt a lemondás során");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleStay = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={ref} className="sm:max-w-md">
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Kérlek várj...</p>
          </div>
        )}

        {step === "offer" && offer?.eligible && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
                <Gift className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl">
                Várj! Van egy különleges ajánlatunk! 🎁
              </DialogTitle>
              <DialogDescription>
                Szeretnénk, ha maradnál, ezért egy exkluzív kedvezményt kínálunk.
              </DialogDescription>
            </DialogHeader>

            <div className="my-6 rounded-xl border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-secondary/5 p-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="bg-primary/10 text-primary text-lg px-3 py-1">
                  {offer.discountPercent}% KEDVEZMÉNY
                </Badge>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                a következő {offer.discountDurationMonths} hónapra
              </p>

              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="text-lg text-muted-foreground line-through">
                  {offer.currentPrice?.toLocaleString("hu-HU")} Ft/hó
                </span>
                <span className="text-2xl font-bold text-primary">
                  {offer.discountedPrice?.toLocaleString("hu-HU")} Ft/hó
                </span>
              </div>

              <p className="mt-1 text-sm font-medium text-foreground">
                {TIER_NAMES[offer.tier || ""] || offer.tier} csomag
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning-foreground">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>Ez az ajánlat {offer.offerExpiresInHours} órán belül lejár!</span>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={handleAcceptOffer}
                disabled={isApplying}
                className="w-full bg-gradient-to-r from-primary to-primary/80"
                size="lg"
              >
                {isApplying ? "Feldolgozás..." : "Elfogadom a kedvezményt"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleDeclineOffer}
                className="w-full text-muted-foreground"
              >
                Nem, köszönöm
              </Button>
            </div>
          </>
        )}

        {step === "feedback" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Heart className="h-6 w-6 text-muted-foreground" />
              </div>
              <DialogTitle>Sajnáljuk, hogy mész! 😢</DialogTitle>
              <DialogDescription>
                Mielőtt lemondanád, kérlek mondd el, miért döntöttél így. 
                Ez segít nekünk jobbá tenni a szolgáltatást.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4">
              <RadioGroup
                value={selectedReason}
                onValueChange={setSelectedReason}
                className="space-y-3"
              >
                {CANCELLATION_REASONS.map((reason) => (
                  <div
                    key={reason.value}
                    className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value={reason.value} id={reason.value} />
                    <Label htmlFor={reason.value} className="flex-1 cursor-pointer">
                      {reason.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {selectedReason === "other" && (
                <Textarea
                  placeholder="Kérlek írd le részletesebben..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="mt-3"
                  rows={3}
                />
              )}
            </div>

            {subscriptionEnd && (
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">
                  Ha lemondod, még használhatod a szolgáltatást a jelenlegi időszak végéig.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={handleStay}
                className="w-full"
                size="lg"
              >
                Mégis maradok 💚
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isCancelling || !selectedReason}
                className="w-full"
              >
                {isCancelling ? "Feldolgozás..." : "Lemondás véglegesítése"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});
