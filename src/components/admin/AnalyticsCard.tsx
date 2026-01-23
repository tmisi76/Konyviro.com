import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  value: string | number | undefined;
  change?: number;
  icon: LucideIcon;
  className?: string;
}

export function AnalyticsCard({ title, value, change, icon: Icon, className }: AnalyticsCardProps) {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <Icon className="h-8 w-8 text-primary" />
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              isPositive ? "text-green-500" : "text-red-500"
            )}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{isPositive ? "+" : ""}{change}%</span>
            </div>
          )}
        </div>
        <p className="text-3xl font-bold mt-4">{value ?? "-"}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}
