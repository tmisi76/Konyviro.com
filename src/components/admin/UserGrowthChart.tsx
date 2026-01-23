import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface UserGrowthChartProps {
  data?: { date: string; users: number }[];
}

export function UserGrowthChart({ data = [] }: UserGrowthChartProps) {
  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Nincs adat
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Area
          type="monotone"
          dataKey="users"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#userGradient)"
          name="Új felhasználók"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
