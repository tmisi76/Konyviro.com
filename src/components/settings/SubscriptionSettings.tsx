import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { hu } from "date-fns/locale";
import {
  Crown,
  CreditCard,
  Calendar,
  Download,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  Zap,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStripeSubscription } from "@/hooks/useStripeSubscription";
import { useSubscription } from "@/hooks/useSubscription";
import { RetentionOfferModal } from "./RetentionOfferModal";
import { PlanComparisonModal } from "./PlanComparisonModal";
import { ReferralCard } from "./ReferralCard";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const TIER_NAMES: Record<string, string> = {
  free: "Ingyenes",
  hobby: "Hobbi",
  writer: "Író",
  pro: "Pro",
};

// Limits now come from database, no hardcoded values needed

const CARD_BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
};

export function SubscriptionSettings() {
  const navigate = useNavigate();
  const {
    subscription: stripeData,
    isLoading: stripeLoading,
    refresh,
    openCustomerPortal,
  } = useStripeSubscription();
  const { 
    subscription: usageData, 
    usage, 
    isLoading: usageLoading,
    activeProjectCount,
    getNextResetDate,
  } = useSubscription();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isDangerOpen, setIsDangerOpen] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const isLoading = stripeLoading || usageLoading;
  
  // Use database as primary source for tier and limits (synced via Stripe webhook)
  const tier = usageData?.tier || stripeData.tier || "free";
  const tierName = TIER_NAMES[tier] || "Ingyenes";
  const isFounder = usageData?.isFounder || false;
  
  // Limits from database (profiles table)
  const projectLimit = usageData?.projectLimit === -1 ? Infinity : (usageData?.projectLimit || 1);
  const wordLimit = usageData?.monthlyWordLimit === -1 ? Infinity : (usageData?.monthlyWordLimit || 1000);
  const extraCredits = usageData?.extraWordsBalance || 0;

  // Calculate days remaining
  const daysRemaining = stripeData.subscriptionEnd
    ? differenceInDays(new Date(stripeData.subscriptionEnd), new Date())
    : 0;

  // Calculate usage percentages - use actual active project count
  const projectsUsed = activeProjectCount;
  const wordsUsed = usage?.wordsGenerated || 0;
  const projectPercentage = projectLimit === Infinity ? 0 : (projectsUsed / projectLimit) * 100;
  const wordPercentage = wordLimit === Infinity ? 0 : (wordsUsed / wordLimit) * 100;

  // Next reset date from subscription hook (considers subscription start date)
  const nextReset = getNextResetDate();

  const handleOpenPortal = async () => {
    setIsPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error("Error opening portal:", error);
      toast.error("Nem sikerült megnyitni a fizetési portált");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleRefresh = async () => {
    await refresh();
    toast.success("Előfizetési adatok frissítve");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="rounded-xl border bg-card p-6 shadow-material-1">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-foreground">{tierName}</h3>
                {isFounder && (
                  <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                    Alapító
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {stripeData.billingInterval === "month" ? "Havi" : "Éves"} előfizetés
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {stripeData.subscribed && stripeData.subscriptionStart && stripeData.subscriptionEnd && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Kezdés</p>
              <p className="font-medium text-foreground">
                {format(new Date(stripeData.subscriptionStart), "yyyy. MMM d.", { locale: hu })}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Lejárat</p>
              <p className="font-medium text-foreground">
                {format(new Date(stripeData.subscriptionEnd), "yyyy. MMM d.", { locale: hu })}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Hátralévő napok</p>
              <p className="font-medium text-foreground">{daysRemaining} nap</p>
            </div>
          </div>
        )}

        {stripeData.cancelAtPeriodEnd && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Az előfizetésed{" "}
              {stripeData.subscriptionEnd &&
                format(new Date(stripeData.subscriptionEnd), "yyyy. MMM d.", { locale: hu })}
              -án lejár és nem újul meg.
            </span>
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      <div className="rounded-xl border bg-card p-6 shadow-material-1">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Használat</h3>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Projektek</span>
              </div>
              <span className="text-muted-foreground">
                {projectsUsed} / {projectLimit === Infinity ? "∞" : projectLimit}
              </span>
            </div>
            <Progress value={projectPercentage} className="h-2" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">AI szavak (havi)</span>
              </div>
              <span className="text-muted-foreground">
                {wordsUsed.toLocaleString("hu-HU")} /{" "}
                {wordLimit === Infinity ? "∞" : wordLimit.toLocaleString("hu-HU")}
              </span>
            </div>
            <Progress value={wordPercentage} className="h-2" />
          </div>

          {/* Extra credits display */}
          {extraCredits > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3 text-sm">
              <span className="text-muted-foreground">Extra kredit egyenleg</span>
              <span className="font-medium text-primary">
                +{extraCredits.toLocaleString("hu-HU")} szó
              </span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Következő reset: {format(nextReset, "yyyy. MMM d.", { locale: hu })}
          </p>
        </div>
      </div>

      {/* Referral Card - Available for ALL users */}
      <ReferralCard />

      {/* Plan Change */}
      <div className="rounded-xl border bg-card p-6 shadow-material-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Csomag módosítása</h3>
            <p className="text-sm text-muted-foreground">
              Tekintsd meg a csomagokat és válts, ha szeretnél
            </p>
          </div>
          <Button onClick={() => setIsPlanModalOpen(true)}>
            Csomagok megtekintése
          </Button>
        </div>
        
        {tier !== "pro" && tier !== "free" && (
          <p className="mt-3 text-xs text-muted-foreground">
            Frissítéskor az árból levonjuk a fennmaradó időszak arányos részét.
          </p>
        )}
      </div>

      {/* Plan Comparison Modal */}
      <PlanComparisonModal open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen} />

      {/* Payment Information */}
      {stripeData.subscribed && (
        <div className="rounded-xl border bg-card p-6 shadow-material-1">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Fizetési adatok</h3>
          
          {stripeData.cardLast4 && (
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/50 p-4">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  {CARD_BRANDS[stripeData.cardBrand || ""] || stripeData.cardBrand} •••• {stripeData.cardLast4}
                </p>
                <p className="text-sm text-muted-foreground">
                  Lejárat: {stripeData.cardExpMonth}/{stripeData.cardExpYear}
                </p>
              </div>
            </div>
          )}

          <Button variant="outline" onClick={handleOpenPortal} disabled={isPortalLoading}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {isPortalLoading ? "Betöltés..." : "Fizetési mód módosítása"}
          </Button>
        </div>
      )}

      {/* Billing History */}
      {stripeData.invoices.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-material-1">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Számlázási előzmények</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dátum</TableHead>
                  <TableHead>Leírás</TableHead>
                  <TableHead>Összeg</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead className="text-right">Számla</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stripeData.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {format(new Date(invoice.date), "yyyy. MMM d.", { locale: hu })}
                    </TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell>
                      {(invoice.amount / 100).toLocaleString("hu-HU")} {invoice.currency.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={invoice.status === "paid" ? "default" : "secondary"}
                        className={invoice.status === "paid" ? "bg-success text-success-foreground" : ""}
                      >
                        {invoice.status === "paid" ? "Fizetve" : invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.invoice_pdf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(invoice.invoice_pdf!, "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Renewal Section */}
      {stripeData.subscribed && isFounder && (
        <div className="rounded-xl border bg-card p-6 shadow-material-1">
          <h3 className="mb-2 text-lg font-semibold text-foreground">Megújítás</h3>
          <p className="text-sm text-muted-foreground">
            Az alapító árad a következő évben is érvényes marad. Az előfizetésed automatikusan megújul a lejárat után.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            A megújítási beállításokat a{" "}
            <button
              onClick={handleOpenPortal}
              className="text-primary hover:underline"
              disabled={isPortalLoading}
            >
              Stripe fizetési portálon
            </button>{" "}
            tudod módosítani.
          </p>
        </div>
      )}

      {/* Danger Zone */}
      {stripeData.subscribed && (
        <Collapsible open={isDangerOpen} onOpenChange={setIsDangerOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <span>Veszélyes műveletek</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isDangerOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-destructive/20 bg-destructive/5 p-6">
              <h4 className="font-semibold text-destructive">Előfizetés lemondása</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Ha lemondod az előfizetésedet, a jelenlegi időszak végéig még használhatod a szolgáltatást.
                Az alapító kedvezményed elvész, ha később újra előfizetsz.
              </p>
              <Button
                variant="destructive"
                className="mt-4"
                onClick={() => setIsCancelOpen(true)}
              >
                Előfizetés lemondása
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Footer Note */}
      <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        <p>Havidíjas előfizetés hamarosan elérhető</p>
        <p className="mt-1">
          Kérdésed van? Írj nekünk:{" "}
          <a href="mailto:support@konyviroai.hu" className="text-primary hover:underline">
            support@konyviroai.hu
          </a>
        </p>
      </div>

      {/* Cancel Modal with Retention Offer */}
      <RetentionOfferModal
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        subscriptionEnd={stripeData.subscriptionEnd}
        onSuccess={refresh}
      />
    </div>
  );
}
