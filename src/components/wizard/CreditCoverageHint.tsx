import { Link } from "react-router-dom";
import { AlertTriangle, Coins } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

interface CreditCoverageHintProps {
  length: number;
  className?: string;
}

/**
 * Megjeleníti a felhasználó elérhető szó-kreditjét és figyelmeztet,
 * ha a kiválasztott hossz több mint amennyi kredit rendelkezésre áll.
 */
export function CreditCoverageHint({ length, className }: CreditCoverageHintProps) {
  const { getRemainingWords, isLoading } = useSubscription();

  if (isLoading) return null;

  const remaining = getRemainingWords();
  const isUnlimited = remaining === Infinity;
  const hasEnough = isUnlimited || length <= remaining;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        hasEnough
          ? "border-border bg-muted/40 text-muted-foreground"
          : "border-destructive/40 bg-destructive/10 text-destructive",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {hasEnough ? (
          <Coins className="h-4 w-4 shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        )}
        <span>
          Elérhető kredit:{" "}
          <strong className="text-foreground">
            {isUnlimited ? "Korlátlan" : `${remaining.toLocaleString("hu-HU")} szó`}
          </strong>
        </span>
      </div>
      {!hasEnough && (
        <div className="mt-2 space-y-1">
          <p>
            A választott hossz <strong>{length.toLocaleString("hu-HU")} szó</strong>, ez
            több, mint a jelenleg elérhető krediteted. Csökkentsd a hosszt, vagy
            vásárolj extra kreditet a továbblépéshez.
          </p>
          <Link
            to="/pricing"
            className="inline-block font-medium underline underline-offset-2 hover:opacity-80"
          >
            Kredit vásárlása →
          </Link>
        </div>
      )}
    </div>
  );
}
