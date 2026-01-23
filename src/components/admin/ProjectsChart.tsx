import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ProjectsChartProps {
  data?: { date: string; projects: number }[];
}

export function ProjectsChart({ data = [] }: ProjectsChartProps) {
  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Nincs adat
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
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
        <Line
          type="monotone"
          dataKey="projects"
          stroke="hsl(142, 76%, 36%)"
          strokeWidth={2}
          dot={{ fill: "hsl(142, 76%, 36%)", strokeWidth: 2 }}
          name="Projektek"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
