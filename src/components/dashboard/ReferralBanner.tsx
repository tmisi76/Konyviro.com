import { useState } from "react";
import { Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReferralModal } from "@/components/settings/ReferralModal";
import { REFERRAL_BONUS_WORDS } from "@/constants/referral";

export function ReferralBanner() {
  const [showModal, setShowModal] = useState(false);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('hu-HU').format(num);
  };

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Ajánld a Könyvírót barátaidnak!
              </h3>
              <p className="text-sm text-muted-foreground">
                Mindketten kaptok <span className="font-medium text-primary">{formatNumber(REFERRAL_BONUS_WORDS)} szó</span> kreditet
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowModal(true)}
            variant="outline"
            className="shrink-0 gap-2 border-primary text-primary hover:bg-primary/10 hover:text-primary"
          >
            Megosztás
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <ReferralModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
