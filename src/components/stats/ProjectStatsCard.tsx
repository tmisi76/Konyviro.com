import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "./ProgressRing";
import { Clock, Bot, CalendarCheck } from "lucide-react";

interface ProjectStatsCardProps {
  wordCount: number;
  targetWordCount: number;
  aiWordsGenerated?: number;
  totalTimeSpent?: number; // in seconds
  averageWordsPerDay?: number;
  className?: string;
}

export function ProjectStatsCard({
  wordCount,
  targetWordCount,
  aiWordsGenerated = 0,
  totalTimeSpent = 0,
  averageWordsPerDay = 500,
  className,
}: ProjectStatsCardProps) {
  const progress = Math.min((wordCount / targetWordCount) * 100, 100);
  const remainingWords = Math.max(targetWordCount - wordCount, 0);

  // Calculate estimated completion date
  const estimatedDays = useMemo(() => {
    if (averageWordsPerDay <= 0 || remainingWords <= 0) return 0;
    return Math.ceil(remainingWords / averageWordsPerDay);
  }, [remainingWords, averageWordsPerDay]);

  const estimatedDate = useMemo(() => {
    if (estimatedDays <= 0) return null;
    const date = new Date();
    date.setDate(date.getDate() + estimatedDays);
    return date;
  }, [estimatedDays]);

  // Calculate AI ratio
  const aiRatio = useMemo(() => {
    if (wordCount <= 0) return 0;
    return Math.round((aiWordsGenerated / wordCount) * 100);
  }, [wordCount, aiWordsGenerated]);

  // Format time spent
  const formattedTime = useMemo(() => {
    const hours = Math.floor(totalTimeSpent / 3600);
    const minutes = Math.floor((totalTimeSpent % 3600) / 60);
    if (hours > 0) {
      return `${hours}ó ${minutes}p`;
    }
    return `${minutes} perc`;
  }, [totalTimeSpent]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Projekt előrehaladás</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress ring */}
        <div className="flex items-center gap-4">
          <ProgressRing progress={progress} size={80} strokeWidth={6}>
            <div className="text-center">
              <p className="text-sm font-bold">{Math.round(progress)}%</p>
            </div>
          </ProgressRing>
          <div className="flex-1">
            <p className="text-2xl font-bold">
              {wordCount.toLocaleString("hu-HU")}
            </p>
            <p className="text-sm text-muted-foreground">
              / {targetWordCount.toLocaleString("hu-HU")} szó
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Még {remainingWords.toLocaleString("hu-HU")} szó hátra
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          {/* Estimated completion */}
          <div className="flex items-start gap-2">
            <CalendarCheck className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Becsült befejezés</p>
              <p className="text-sm font-medium">
                {estimatedDate
                  ? estimatedDate.toLocaleDateString("hu-HU", {
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </p>
              {estimatedDays > 0 && (
                <p className="text-xs text-muted-foreground">
                  {estimatedDays} nap múlva
                </p>
              )}
            </div>
          </div>

          {/* Time spent */}
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Írással töltött idő</p>
              <p className="text-sm font-medium">{formattedTime}</p>
            </div>
          </div>

          {/* AI ratio */}
          <div className="flex items-start gap-2 col-span-2">
            <Bot className="h-4 w-4 text-secondary mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">AI segítség aránya</p>
                <p className="text-xs font-medium">{aiRatio}%</p>
              </div>
              <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary rounded-full transition-all duration-300"
                  style={{ width: `${aiRatio}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
