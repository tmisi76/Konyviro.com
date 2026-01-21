import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FullPageLoaderProps {
  message?: string;
  className?: string;
}

export function FullPageLoader({ message = "Betöltés...", className }: FullPageLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center bg-background",
        className
      )}
    >
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-2xl font-bold text-primary-foreground">K</span>
        </div>
        <span className="text-2xl font-bold text-foreground">KönyvÍró</span>
      </div>

      {/* Spinner */}
      <div className="relative mb-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>

      {/* Message */}
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}
