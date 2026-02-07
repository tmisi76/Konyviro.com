import { useState } from "react";
import { Gift, Copy, Check, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReferral } from "@/hooks/useReferral";
import { REFERRAL_BONUS_WORDS } from "@/constants/referral";
import { toast } from "sonner";

export function ReferralCard() {
  const { referralLink, successfulReferrals, totalCreditsEarned, isLoading } = useReferral();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!referralLink) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Link másolva a vágólapra!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Nem sikerült másolni a linket");
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('hu-HU').format(num);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-10 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-primary" />
          Hívd meg barátaidat!
        </CardTitle>
        <CardDescription>
          Oszd meg az ajánló linkedet és mindketten kaptok{" "}
          <span className="font-semibold text-primary">
            {formatNumber(REFERRAL_BONUS_WORDS)} szó kreditet
          </span>
          !
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Link */}
        <div className="flex gap-2">
          <Input
            value={referralLink || "Betöltés..."}
            readOnly
            className="font-mono text-sm bg-muted/50"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            disabled={!referralLink}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{successfulReferrals}</p>
              <p className="text-xs text-muted-foreground">Sikeres meghívás</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Gift className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{formatNumber(totalCreditsEarned)}</p>
              <p className="text-xs text-muted-foreground">Szerzett kredit</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground pt-2">
          Minden sikeres meghívás után te és a meghívott is kap {formatNumber(REFERRAL_BONUS_WORDS)} szó kreditet.
          Nincs korlát – minél többen csatlakoznak, annál több kreditet kapsz!
        </p>
      </CardContent>
    </Card>
  );
}
