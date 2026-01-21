import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak?: number;
  showLongest?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  showLongest = false,
  size = "md",
  className,
}: StreakDisplayProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const isActive = currentStreak > 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium",
          isActive
            ? "bg-warning/20 text-warning"
            : "bg-muted text-muted-foreground",
          sizeClasses[size]
        )}
      >
        <Flame
          className={cn(
            iconSizes[size],
            isActive && "animate-pulse-subtle"
          )}
        />
        <span>{currentStreak}</span>
        <span className="text-xs opacity-75">nap</span>
      </div>

      {showLongest && longestStreak !== undefined && longestStreak > 0 && (
        <div className="text-xs text-muted-foreground">
          Leghosszabb: {longestStreak} nap
        </div>
      )}
    </div>
  );
}
