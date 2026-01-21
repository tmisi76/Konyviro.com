import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RetryErrorProps {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
  compact?: boolean;
}

export function RetryError({
  message = "Hiba történt az adatok betöltésekor",
  onRetry,
  isRetrying = false,
  className,
  compact = false,
}: RetryErrorProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-destructive", className)}>
        <AlertCircle className="h-4 w-4" />
        <span>{message}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="h-auto p-1"
        >
          <RefreshCw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{message}</p>
      <Button
        variant="outline"
        onClick={onRetry}
        disabled={isRetrying}
        className="gap-2"
      >
        <RefreshCw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
        {isRetrying ? "Újrapróbálás..." : "Újrapróbálás"}
      </Button>
    </div>
  );
}
