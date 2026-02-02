import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { toast } from "sonner";
import {
  CreditCard,
  TrendingUp,
  DollarSign,
  UserMinus,
  ExternalLink,
  Settings,
  MoreHorizontal,
  Check,
  Clock,
  X,
  RefreshCcw,
  RotateCcw,
  XCircle,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useBillingStats } from "@/hooks/admin/useBillingStats";
import { useAdminSubscriptions } from "@/hooks/admin/useAdminSubscriptions";
import { useRecentInvoices } from "@/hooks/admin/useRecentInvoices";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminBilling() {
  const queryClient = useQueryClient();
  const { data: billingStats, isLoading: statsLoading } = useBillingStats();
  const { data: subscriptions, isLoading: subsLoading } = useAdminSubscriptions();
  const { data: recentInvoices, isLoading: invoicesLoading } = useRecentInvoices(10);
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const viewInStripe = (subscriptionId: string | null) => {
    if (subscriptionId) {
      window.open(`https://dashboard.stripe.com/subscriptions/${subscriptionId}`, "_blank");
    } else {
      toast.error("Nincs Stripe előfizetés azonosító");
    }
  };

  const changePlan = (userId: string) => {
    toast.info("Csomag módosítás funkció hamarosan...");
  };

  const extendTrial = (userId: string) => {
    toast.info("Próbaidő meghosszabbítás hamarosan...");
  };

  const refund = (userId: string) => {
    toast.info("Visszatérítés funkció hamarosan...");
  };

  const openCancelDialog = (userId: string, email: string) => {
    setSelectedUser({ id: userId, email });
    setCancelDialogOpen(true);
  };

  const handleCancelSubscription = async () => {
    if (!selectedUser) return;
    
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-cancel-subscription", {
        body: { 
          userId: selectedUser.id,
          cancelImmediately: false 
        },
      });

      if (error) throw error;

      toast.success(`${selectedUser.email} előfizetése lemondva. A jelenlegi időszak végéig aktív marad.`);
      setCancelDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      toast.error("Hiba történt a lemondás során");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Számlázás & Előfizetések</h1>
          <p className="text-muted-foreground">Stripe integráció és bevétel kezelés</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Stripe Dashboard
            </a>
          </Button>
          <Button asChild>
            <Link to="/admin/billing/plans">
              <Settings className="h-4 w-4 mr-2" />
              Csomagok kezelése
            </Link>
          </Button>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <DollarSign className="h-8 w-8 text-green-500" />
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    +{billingStats?.mrrChange}%
                  </Badge>
                </div>
                <p className="text-3xl font-bold mt-4">
                  {billingStats?.mrr?.toLocaleString()} Ft
                </p>
                <p className="text-sm text-muted-foreground">
                  Összes MRR (havi ekv.)
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-6">
                <DollarSign className="h-8 w-8 text-blue-500" />
                <p className="text-3xl font-bold mt-4">
                  {billingStats?.monthlyMRR?.toLocaleString()} Ft
                </p>
                <p className="text-sm text-muted-foreground">
                  Havi előfizetések ({billingStats?.monthlyCount || 0} fő)
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-6">
                <DollarSign className="h-8 w-8 text-purple-500" />
                <p className="text-3xl font-bold mt-4">
                  {billingStats?.yearlyRevenue?.toLocaleString()} Ft
                </p>
                <p className="text-sm text-muted-foreground">
                  Éves bevétel ({billingStats?.yearlyCount || 0} fő)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <TrendingUp className="h-8 w-8 text-emerald-500" />
                <p className="text-3xl font-bold mt-4">{billingStats?.newThisMonth}</p>
                <p className="text-sm text-muted-foreground">Új előfizető (hónap)</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <UserMinus className="h-8 w-8 text-red-500" />
                <p className="text-3xl font-bold mt-4">{billingStats?.churnRate}%</p>
                <p className="text-sm text-muted-foreground">Lemorzsolódás</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Bevétel alakulása</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <RevenueChart data={billingStats?.revenueHistory} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Csomag eloszlás</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {billingStats?.planDistribution?.map((plan) => (
                  <div key={plan.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: plan.color }}
                        />
                        {plan.name}
                      </span>
                      <span>
                        {plan.count} ({plan.percentage}%)
                      </span>
                    </div>
                    <Progress value={plan.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Legutóbbi számlák</CardTitle>
            <Button variant="ghost" size="sm">
              Mind →
            </Button>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {recentInvoices?.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          invoice.status === "paid" && "bg-green-500/20 text-green-500",
                          invoice.status === "pending" &&
                            "bg-yellow-500/20 text-yellow-500",
                          invoice.status === "failed" && "bg-red-500/20 text-red-500"
                        )}
                      >
                        {invoice.status === "paid" && <Check className="h-4 w-4" />}
                        {invoice.status === "pending" && <Clock className="h-4 w-4" />}
                        {invoice.status === "failed" && <X className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{invoice.customer_email}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(invoice.created_at), "yyyy.MM.dd HH:mm", {
                            locale: hu,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {invoice.amount.toLocaleString()} Ft
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.plan_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Aktív előfizetések</CardTitle>
        </CardHeader>
        <CardContent>
          {subsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Felhasználó</TableHead>
                  <TableHead>Csomag</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Kezdés</TableHead>
                  <TableHead>Következő számlázás</TableHead>
                  <TableHead>Összeg</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions?.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {sub.user_email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{sub.user_email}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {sub.stripe_customer_id || "N/A"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge>{sub.plan_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === "active"
                            ? "default"
                            : sub.status === "past_due"
                            ? "destructive"
                            : sub.status === "trialing"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {sub.status === "active" && "Aktív"}
                        {sub.status === "past_due" && "Lejárt fizetés"}
                        {sub.status === "trialing" && "Próbaidő"}
                        {sub.status === "cancelled" && "Lemondva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(sub.current_period_start), "yyyy.MM.dd")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(sub.current_period_end), "yyyy.MM.dd")}
                      {sub.cancel_at_period_end && (
                        <Badge variant="outline" className="ml-2 text-orange-500">
                          Megszűnik
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {sub.amount?.toLocaleString()} Ft{sub.billing_period === 'yearly' ? '/év' : '/hó'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => viewInStripe(sub.stripe_subscription_id)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Stripe-ban megtekintés
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changePlan(sub.id)}>
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Csomag módosítása
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => extendTrial(sub.id)}>
                            <Clock className="h-4 w-4 mr-2" />
                            Próbaidő meghosszabbítása
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => refund(sub.id)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Visszatérítés
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openCancelDialog(sub.user_id, sub.user_email)}
                            className="text-red-500"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Előfizetés lemondása
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Előfizetés lemondása</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan le szeretnéd mondani <strong>{selectedUser?.email}</strong> előfizetését?
              Az előfizetés a jelenlegi időszak végéig aktív marad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Mégsem</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Lemondás...
                </>
              ) : (
                "Lemondás"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
