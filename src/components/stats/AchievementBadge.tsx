import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Achievement } from "@/types/stats";

interface AchievementBadgeProps {
  achievement: Achievement & { isUnlocked: boolean; unlockedAt?: string };
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export function AchievementBadge({
  achievement,
  size = "md",
  showTooltip = true,
  className,
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: "h-10 w-10 text-lg",
    md: "h-14 w-14 text-2xl",
    lg: "h-20 w-20 text-4xl",
  };

  const badge = (
    <div
      className={cn(
        "flex items-center justify-center rounded-full transition-all",
        sizeClasses[size],
        achievement.isUnlocked
          ? "bg-primary/10 ring-2 ring-primary shadow-lg"
          : "bg-muted grayscale opacity-50",
        className
      )}
    >
      <span className={achievement.isUnlocked ? "" : "grayscale"}>
        {achievement.icon}
      </span>
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="font-semibold">{achievement.name}</p>
        <p className="text-xs text-muted-foreground">{achievement.description}</p>
        {achievement.isUnlocked && achievement.unlockedAt && (
          <p className="text-xs text-primary mt-1">
            Megszerzve:{" "}
            {new Date(achievement.unlockedAt).toLocaleDateString("hu-HU")}
          </p>
        )}
        {!achievement.isUnlocked && (
          <p className="text-xs text-muted-foreground mt-1">🔒 Még nem szerzett meg</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
