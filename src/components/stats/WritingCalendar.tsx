import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CalendarData {
  date: string;
  level: number; // 0-4
}

interface WritingCalendarProps {
  data: CalendarData[];
  className?: string;
}

const WEEKDAYS = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];
const MONTHS = ["Jan", "Feb", "Már", "Ápr", "Máj", "Jún", "Júl", "Aug", "Szep", "Okt", "Nov", "Dec"];

export function WritingCalendar({ data, className }: WritingCalendarProps) {
  // Group data by weeks
  const weeks: CalendarData[][] = [];
  let currentWeek: CalendarData[] = [];

  // Pad the first week to start on the correct day
  const firstDate = data[0] ? new Date(data[0].date) : new Date();
  const firstDayOfWeek = firstDate.getDay();

  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: "", level: -1 }); // Empty cells
  }

  data.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Get month labels
  const monthLabels: { month: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    const firstValidDay = week.find((d) => d.date);
    if (firstValidDay) {
      const date = new Date(firstValidDay.date);
      const month = date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ month: MONTHS[month], weekIndex });
        lastMonth = month;
      }
    }
  });

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0:
        return "bg-muted";
      case 1:
        return "bg-primary/25";
      case 2:
        return "bg-primary/50";
      case 3:
        return "bg-primary/75";
      case 4:
        return "bg-primary";
      default:
        return "bg-transparent";
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      {/* Month labels */}
      <div className="flex mb-1 text-xs text-muted-foreground">
        <div className="w-8" /> {/* Spacer for weekday labels */}
        <div className="flex gap-0.5">
          {weeks.map((_, weekIndex) => {
            const label = monthLabels.find((m) => m.weekIndex === weekIndex);
            return (
              <div key={weekIndex} className="w-3 text-center">
                {label ? (
                  <span className="text-[10px]">{label.month}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex">
        {/* Weekday labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {WEEKDAYS.map((day, i) => (
            <div
              key={i}
              className="h-3 w-6 text-[10px] text-muted-foreground flex items-center justify-end pr-1"
            >
              {i % 2 === 1 ? day : ""}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="flex gap-0.5">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const day = week[dayIndex];
                if (!day || day.level === -1) {
                  return (
                    <div
                      key={dayIndex}
                      className="h-3 w-3 rounded-sm bg-transparent"
                    />
                  );
                }

                return (
                  <Tooltip key={dayIndex}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-3 w-3 rounded-sm transition-colors cursor-default",
                          getLevelColor(day.level)
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>{formatDate(day.date)}</p>
                      <p className="text-muted-foreground">
                        {day.level === 0 ? "Nincs írás" : `Aktivitás: ${day.level}/4`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2 text-xs text-muted-foreground">
        <span>Kevesebb</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn("h-3 w-3 rounded-sm", getLevelColor(level))}
          />
        ))}
        <span>Több</span>
      </div>
    </div>
  );
}
