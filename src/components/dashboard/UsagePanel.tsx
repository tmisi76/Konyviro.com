import { useMemo } from "react";
import { Zap, FolderOpen, Calendar, ArrowUpRight, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, addMonths, startOfMonth } from "date-fns";
import { hu } from "date-fns/locale";
import { useSubscription } from "@/hooks/useSubscription";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TIER_NAMES: Record<string, string> = {
  free: "Ingyenes",
  hobby: "Hobbi",
  writer: "Író",
  pro: "PRO",
};

export function UsagePanel() {
  const navigate = useNavigate();
  const { subscription, usage, isLoading } = useSubscription();

  // Calculate next reset date (first day of next month)
  const nextResetDate = useMemo(() => {
    const nextMonth = addMonths(startOfMonth(new Date()), 1);
    return format(nextMonth, "yyyy. MMMM d.", { locale: hu });
  }, []);

  // Calculate usage percentages
  const wordUsage = useMemo(() => {
    if (!subscription || !usage) return { percent: 0, remaining: 0, total: 0, used: 0 };
    const total = subscription.monthlyWordLimit === -1 ? Infinity : subscription.monthlyWordLimit;
    const used = usage.wordsGenerated;
    const remaining = total === Infinity ? Infinity : Math.max(0, total - used);
    const percent = total === Infinity ? 0 : Math.min(100, Math.round((used / total) * 100));
    return { percent, remaining, total, used };
  }, [subscription, usage]);

  const projectUsage = useMemo(() => {
    if (!subscription || !usage) return { percent: 0, remaining: 0, total: 0, used: 0 };
    const total = subscription.projectLimit === -1 ? Infinity : subscription.projectLimit;
    const used = usage.projectsCreated;
    const remaining = total === Infinity ? Infinity : Math.max(0, total - used);
    const percent = total === Infinity ? 0 : Math.min(100, Math.round((used / total) * 100));
    return { percent, remaining, total, used };
  }, [subscription, usage]);

  // Determine status colors based on usage
  const getStatusColor = (percent: number) => {
    if (percent >= 100) return "text-destructive";
    if (percent >= 90) return "text-destructive";
    if (percent >= 75) return "text-yellow-600 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-destructive";
    if (percent >= 90) return "bg-destructive";
    if (percent >= 75) return "bg-yellow-500";
    return "";
  };

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) return { label: "Limit elérve", variant: "destructive" as const };
    if (percent >= 90) return { label: "Majdnem elfogyott", variant: "destructive" as const };
    if (percent >= 75) return { label: "Közel a limithez", variant: "secondary" as const };
    return null;
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  const tierName = TIER_NAMES[subscription?.tier || "free"] || subscription?.tier;
  const wordBadge = getStatusBadge(wordUsage.percent);
  const projectBadge = getStatusBadge(projectUsage.percent);
  const isUnlimited = subscription?.monthlyWordLimit === -1;
  const isUnlimitedProjects = subscription?.projectLimit === -1;

  return (
    <div className="rounded-xl border bg-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Havi használat</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {tierName}
        </Badge>
      </div>

      {/* Word Usage */}
      <div className="mb-4 rounded-lg bg-muted/50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI szavak</span>
          </div>
          {wordBadge && (
            <Badge variant={wordBadge.variant} className="text-xs">
              {wordBadge.label}
            </Badge>
          )}
        </div>
        
        {isUnlimited ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">
              {wordUsage.used.toLocaleString("hu-HU")}
            </span>
            <span className="text-sm text-muted-foreground">szó (korlátlan)</span>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <Progress 
                value={wordUsage.percent} 
                className={cn("h-2", getProgressColor(wordUsage.percent))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className={cn("text-sm", getStatusColor(wordUsage.percent))}>
                {wordUsage.used.toLocaleString("hu-HU")} / {wordUsage.total.toLocaleString("hu-HU")} szó
              </span>
              <span className="text-xs text-muted-foreground">
                {wordUsage.percent}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* Project Usage */}
      <div className="mb-4 rounded-lg bg-muted/50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Projektek</span>
          </div>
          {projectBadge && (
            <Badge variant={projectBadge.variant} className="text-xs">
              {projectBadge.label}
            </Badge>
          )}
        </div>
        
        {isUnlimitedProjects ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">
              {projectUsage.used}
            </span>
            <span className="text-sm text-muted-foreground">projekt (korlátlan)</span>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <Progress 
                value={projectUsage.percent} 
                className={cn("h-2", getProgressColor(projectUsage.percent))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className={cn("text-sm", getStatusColor(projectUsage.percent))}>
                {projectUsage.used} / {projectUsage.total} projekt
              </span>
              <span className="text-xs text-muted-foreground">
                {projectUsage.percent}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* Reset date */}
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span>Limit reset: {nextResetDate}</span>
      </div>

      {/* Action buttons */}
      {(wordUsage.percent >= 75 || projectUsage.percent >= 75) && (
        <Button 
          onClick={() => navigate("/pricing")} 
          className="w-full gap-2"
          size="sm"
        >
          <ArrowUpRight className="h-4 w-4" />
          Csomag váltás
        </Button>
      )}
    </div>
  );
}
