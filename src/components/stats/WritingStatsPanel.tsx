import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StreakDisplay } from "./StreakDisplay";
import { ProgressRing } from "./ProgressRing";
import { WritingChart } from "./WritingChart";
import { WritingCalendar } from "./WritingCalendar";
import { AchievementsPanel } from "./AchievementsPanel";
import { GoalSettings } from "./GoalSettings";
import { useWritingStats } from "@/hooks/useWritingStats";
import { useAchievements } from "@/hooks/useAchievements";
import { TrendingUp, Calendar, Award, Target, Zap } from "lucide-react";

interface WritingStatsPanelProps {
  className?: string;
}

export function WritingStatsPanel({ className }: WritingStatsPanelProps) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const {
    goals,
    streak,
    isLoading: statsLoading,
    getDailyStats,
    getTodayWords,
    getAverageWords,
    getBestDay,
    getCalendarData,
    updateGoals,
  } = useWritingStats();

  const { getAllAchievements, isLoading: achievementsLoading } = useAchievements();

  const todayWords = getTodayWords();
  const dailyGoal = goals?.daily_word_goal || 500;
  const todayProgress = Math.min((todayWords / dailyGoal) * 100, 100);
  const averageWords = getAverageWords();
  const bestDay = getBestDay();
  const chartData = getDailyStats(period === "week" ? 7 : 30);
  const calendarData = getCalendarData();
  const achievements = getAllAchievements();

  if (statsLoading || achievementsLoading) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Írási statisztikák</CardTitle>
          <GoalSettings goals={goals} onUpdate={updateGoals} />
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="gap-1.5">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Áttekintés</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Naptár</span>
              </TabsTrigger>
              <TabsTrigger value="achievements" className="gap-1.5">
                <Award className="h-4 w-4" />
                <span className="hidden sm:inline">Jelvények</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Today's progress and streak */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <ProgressRing progress={todayProgress} size={100}>
                  <div className="text-center">
                    <p className="text-lg font-bold">{todayWords}</p>
                    <p className="text-xs text-muted-foreground">/ {dailyGoal}</p>
                  </div>
                </ProgressRing>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Mai cél</span>
                    <span className="text-sm font-medium">
                      {Math.round(todayProgress)}%
                    </span>
                  </div>
                  <StreakDisplay
                    currentStreak={streak?.current_streak || 0}
                    longestStreak={streak?.longest_streak}
                    showLongest
                  />
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs">Átlag/nap</span>
                  </div>
                  <p className="text-lg font-bold">{averageWords.toLocaleString("hu-HU")}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs">Legjobb nap</span>
                  </div>
                  <p className="text-lg font-bold">{bestDay.words.toLocaleString("hu-HU")}</p>
                </div>
              </div>

              {/* Chart */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Szavak időben</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPeriod("week")}
                      className={`px-2 py-1 text-xs rounded ${
                        period === "week"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      Hét
                    </button>
                    <button
                      onClick={() => setPeriod("month")}
                      className={`px-2 py-1 text-xs rounded ${
                        period === "month"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      Hónap
                    </button>
                  </div>
                </div>
                <WritingChart data={chartData} period={period} />
              </div>
            </TabsContent>

            <TabsContent value="calendar">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Az elmúlt év írási aktivitása
                </p>
                <WritingCalendar data={calendarData} />
              </div>
            </TabsContent>

            <TabsContent value="achievements">
              <AchievementsPanel achievements={achievements} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
