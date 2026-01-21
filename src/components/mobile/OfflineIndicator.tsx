import { WifiOff, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingChanges: number;
  isSyncing?: boolean;
}

export function OfflineIndicator({ isOnline, pendingChanges, isSyncing }: OfflineIndicatorProps) {
  if (isOnline && pendingChanges === 0) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all",
        isOnline
          ? "bg-warning text-warning-foreground"
          : "bg-destructive text-destructive-foreground"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Nincs internetkapcsolat</span>
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Szinkronizálás...</span>
        </>
      ) : pendingChanges > 0 ? (
        <>
          <CloudOff className="h-4 w-4" />
          <span>{pendingChanges} változás várakozik</span>
        </>
      ) : null}
    </div>
  );
}
