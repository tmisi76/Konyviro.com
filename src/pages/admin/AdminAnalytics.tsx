import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Activity, CreditCard, DollarSign, Loader2 } from "lucide-react";
import { subDays, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";

import { useAnalytics } from "@/hooks/admin/useAnalytics";
import { AnalyticsCard } from "@/components/admin/AnalyticsCard";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { UserGrowthChart } from "@/components/admin/UserGrowthChart";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { AIUsageChart } from "@/components/admin/AIUsageChart";
import { ProjectsChart } from "@/components/admin/ProjectsChart";

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: analytics, isLoading } = useAnalytics(dateRange);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Analitika</h1>
          <p className="text-muted-foreground">Részletes statisztikák és trendek</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Új felhasználók"
          value={analytics?.newUsers}
          change={analytics?.newUsersChange}
          icon={UserPlus}
        />
        <AnalyticsCard
          title="Aktív felhasználók"
          value={analytics?.activeUsers}
          change={analytics?.activeUsersChange}
          icon={Activity}
        />
        <AnalyticsCard
          title="Új előfizetések"
          value={analytics?.newSubscriptions}
          change={analytics?.newSubscriptionsChange}
          icon={CreditCard}
        />
        <AnalyticsCard
          title="Bevétel"
          value={`${analytics?.revenue?.toLocaleString()} Ft`}
          change={analytics?.revenueChange}
          icon={DollarSign}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Felhasználók növekedése</CardTitle>
          </CardHeader>
          <CardContent>
            <UserGrowthChart data={analytics?.userGrowth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bevétel alakulása</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={analytics?.revenueHistory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI használat</CardTitle>
          </CardHeader>
          <CardContent>
            <AIUsageChart data={analytics?.aiUsage} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projekt létrehozás</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectsChart data={analytics?.projectsCreated} />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Card>
        <CardHeader>
          <CardTitle>Top felhasználók (aktivitás alapján)</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Felhasználó</TableHead>
              <TableHead>Projektek</TableHead>
              <TableHead>Fejezetek</TableHead>
              <TableHead>AI tokenek</TableHead>
              <TableHead>Utolsó aktivitás</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics?.topUsers?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.projects_count}</TableCell>
                <TableCell>{user.chapters_count}</TableCell>
                <TableCell>{user.tokens_used?.toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(user.last_active), {
                    addSuffix: true,
                    locale: hu,
                  })}
                </TableCell>
              </TableRow>
            ))}
            {(!analytics?.topUsers || analytics.topUsers.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nincs adat
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
