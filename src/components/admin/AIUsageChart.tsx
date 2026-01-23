import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AIUsageChartProps {
  data?: { date: string; tokens: number }[];
}

export function AIUsageChart({ data = [] }: AIUsageChartProps) {
  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Nincs adat
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
          formatter={(value: number) => [`${value.toLocaleString()} token`, "Tokenek"]}
        />
        <Bar
          dataKey="tokens"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
          name="Tokenek"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
