import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { DailyStats } from "@/types/stats";

interface WritingChartProps {
  data: DailyStats[];
  period?: "week" | "month";
}

const chartConfig: ChartConfig = {
  words: {
    label: "Szavak",
    color: "hsl(var(--primary))",
  },
  aiWords: {
    label: "AI szavak",
    color: "hsl(var(--secondary))",
  },
};

export function WritingChart({ data, period = "week" }: WritingChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === "week") {
      return date.toLocaleDateString("hu-HU", { weekday: "short" });
    }
    return date.toLocaleDateString("hu-HU", { day: "numeric", month: "short" });
  };

  const chartData = data.map((d) => ({
    ...d,
    name: formatDate(d.date),
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
            width={40}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="words"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#colorWords)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
