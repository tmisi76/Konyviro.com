import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import {
  Users,
  CreditCard,
  BookOpen,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Activity,
  LifeBuoy,
  Bot,
  Download,
  DollarSign,
  Gift,
  Heart,
  Percent,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useAdminStats,
  useRecentUsers,
  useRecentProjects,
  useOpenTickets,
  useRevenueChart,
  useRetentionStats,
} from "@/hooks/admin";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useState } from "react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();
  const { data: recentUsers } = useRecentUsers(5);
  const { data: recentProjects } = useRecentProjects(5);
  const { data: openTickets } = useOpenTickets(5);
  const { data: revenueData } = useRevenueChart(30);
  const { data: retentionStats } = useRetentionStats();
  const [chartType, setChartType] = useState<"revenue" | "users" | "projects">("users");

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nem sikerült betölteni a statisztikákat
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Üdv újra! Itt az áttekintés.</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Riport letöltése
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Összes felhasználó"
          value={stats.totalUsers.toLocaleString()}
          change={stats.usersChange}
          changeLabel="vs előző hónap"
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Havi bevétel"
          value={`${stats.monthlyRevenue.toLocaleString()} Ft`}
          change={stats.revenueChange}
          changeLabel="vs előző hónap"
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Aktív előfizetések"
          value={stats.activeSubscriptions.toLocaleString()}
          change={stats.subscriptionsChange}
          changeLabel="vs előző hónap"
          icon={CreditCard}
          color="purple"
        />
        <StatsCard
          title="Generált könyvek"
          value={stats.totalBooks.toLocaleString()}
          change={stats.booksChange}
          changeLabel="vs előző hónap"
          icon={BookOpen}
          color="orange"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStatCard title="Mai regisztrációk" value={stats.todaySignups} icon={UserPlus} />
        <MiniStatCard title="Aktív most" value={stats.activeNow} icon={Activity} />
        <MiniStatCard title="Nyitott ticketek" value={stats.openTickets} icon={LifeBuoy} />
        <MiniStatCard
          title="AI tokenek ma"
          value={`${(stats.todayTokens / 1000).toFixed(1)}K`}
          icon={Bot}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Trend (utolsó 30 nap)</span>
              <Tabs value={chartType} onValueChange={(v) => setChartType(v as typeof chartType)}>
                <TabsList className="h-8">
                  <TabsTrigger value="users" className="text-xs">
                    Felhasználók
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="text-xs">
                    Projektek
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData || []}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartType}
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Előfizetés eloszlás</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.subscriptionDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {stats.subscriptionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {stats.subscriptionDistribution.map((plan) => (
                <div key={plan.name} className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: plan.color }}
                    />
                    <span className="text-muted-foreground">{plan.name}</span>
                  </div>
                  <span>
                    {plan.count} ({plan.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Legutóbbi regisztrációk</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/users">Mind →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers?.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true,
                        locale: hu,
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={
                      user.subscription_tier !== "free" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {user.subscription_tier === "free"
                      ? "Free"
                      : user.subscription_tier}
                  </Badge>
                </div>
              ))}
              {!recentUsers?.length && (
                <p className="text-center text-muted-foreground py-4">
                  Nincs regisztráció
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Legutóbbi projektek</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/projects">Mind →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProjects?.map((project) => (
                <div key={project.id} className="flex items-center gap-3">
                  <div className="h-10 w-8 bg-muted rounded flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{project.title}</p>
                    <p className="text-xs text-muted-foreground">{project.user_name}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {project.chapters_count} fej.
                  </Badge>
                </div>
              ))}
              {!recentProjects?.length && (
                <p className="text-center text-muted-foreground py-4">
                  Nincs projekt
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Open Support Tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Nyitott ticketek</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/support">Mind →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {openTickets?.map((ticket) => (
                <div key={ticket.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      ticket.priority === "urgent" && "bg-red-500",
                      ticket.priority === "high" && "bg-orange-500",
                      ticket.priority === "medium" && "bg-yellow-500",
                      ticket.priority === "low" && "bg-green-500"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">{ticket.user_name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(ticket.created_at), {
                      addSuffix: true,
                      locale: hu,
                    })}
                  </span>
                </div>
              ))}
              {!openTickets?.length && (
                <p className="text-center text-muted-foreground py-4">
                  🎉 Nincs nyitott ticket!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retention Stats Card */}
      {retentionStats && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Retention Ajánlatok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <RetentionStatItem
                icon={Gift}
                label="Ajánlatok megjelenítve"
                value={retentionStats.offersShown}
              />
              <RetentionStatItem
                icon={Heart}
                label="Elfogadva"
                value={retentionStats.offersAccepted}
                highlight
              />
              <RetentionStatItem
                icon={Percent}
                label="Elfogadási arány"
                value={`${retentionStats.acceptanceRate}%`}
              />
              <RetentionStatItem
                icon={Activity}
                label="Aktív kedvezmények"
                value={retentionStats.activeDiscounts}
              />
              <RetentionStatItem
                icon={DollarSign}
                label="Megmentett bevétel"
                value={`${retentionStats.estimatedRevenueSaved.toLocaleString("hu-HU")} Ft`}
                highlight
              />
              <RetentionStatItem
                icon={TrendingUp}
                label="Átlag/felhasználó"
                value={`${retentionStats.averageSavingsPerUser.toLocaleString("hu-HU")} Ft`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Rendszer állapot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SystemStatusItem name="API" status="operational" latency="45ms" />
            <SystemStatusItem name="Database" status="operational" latency="12ms" />
            <SystemStatusItem name="AI Service" status="operational" latency="230ms" />
            <SystemStatusItem name="Storage" status="operational" usage="42%" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components

interface StatsCardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "orange";
}

function StatsCard({ title, value, change, changeLabel, icon: Icon, color }: StatsCardProps) {
  const isPositive = change >= 0;
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-green-500/10 text-green-500",
    purple: "bg-purple-500/10 text-purple-500",
    orange: "bg-orange-500/10 text-orange-500",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={cn("p-2 rounded-lg", colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-sm",
              isPositive ? "text-green-500" : "text-red-500"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {Math.abs(change)}%
          </div>
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface MiniStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
}

function MiniStatCard({ title, value, icon: Icon }: MiniStatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface SystemStatusItemProps {
  name: string;
  status: "operational" | "degraded" | "down";
  latency?: string;
  usage?: string;
}

function SystemStatusItem({ name, status, latency, usage }: SystemStatusItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div
        className={cn(
          "h-3 w-3 rounded-full",
          status === "operational" && "bg-green-500",
          status === "degraded" && "bg-yellow-500",
          status === "down" && "bg-red-500"
        )}
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{latency || usage}</p>
      </div>
    </div>
  );
}

interface RetentionStatItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  highlight?: boolean;
}

function RetentionStatItem({ icon: Icon, label, value, highlight }: RetentionStatItemProps) {
  return (
    <div className={cn(
      "p-4 rounded-lg text-center",
      highlight ? "bg-primary/10" : "bg-muted/50"
    )}>
      <Icon className={cn(
        "h-5 w-5 mx-auto mb-2",
        highlight ? "text-primary" : "text-muted-foreground"
      )} />
      <p className={cn(
        "text-xl font-bold",
        highlight && "text-primary"
      )}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-8 w-24 mt-4" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
