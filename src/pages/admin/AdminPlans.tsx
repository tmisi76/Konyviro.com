import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Edit,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useSubscriptionPlans, useTogglePlanActive, type AdminPlan } from "@/hooks/admin/useSubscriptionPlans";
import { EditPlanModal } from "@/components/admin/EditPlanModal";
import { cn } from "@/lib/utils";

export default function AdminPlans() {
  const { data: plans, isLoading, refetch } = useSubscriptionPlans();
  const toggleActive = useTogglePlanActive();
  const [editingPlan, setEditingPlan] = useState<Partial<AdminPlan> | null>(null);

  const handleToggleActive = async (planId: string) => {
    try {
      await toggleActive.mutateAsync(planId);
      toast.success("Csomag státusz módosítva!");
      refetch();
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/billing">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Előfizetési Csomagok</h1>
            <p className="text-muted-foreground">Árazás és funkciók kezelése</p>
          </div>
        </div>
        <Button onClick={() => setEditingPlan({})}>
          <Plus className="mr-2 h-4 w-4" />
          Új csomag
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans?.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative",
                !plan.is_active && "opacity-50"
              )}
            >
              {!plan.is_active && (
                <Badge className="absolute top-2 right-2" variant="secondary">
                  Inaktív
                </Badge>
              )}
              {plan.isPopular && (
                <Badge className="absolute top-2 left-2 bg-primary">
                  Népszerű
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setEditingPlan(plan)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Szerkesztés
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(plan.id)}>
                        {plan.is_active ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Inaktiválás
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Aktiválás
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">
                    {plan.price_monthly?.toLocaleString()} Ft
                    <span className="text-sm font-normal text-muted-foreground">
                      /hó
                    </span>
                  </p>
                  {plan.price_yearly > 0 && (
                    <p className="text-sm text-muted-foreground">
                      vagy {plan.price_yearly?.toLocaleString()} Ft/év
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Funkciók:</p>
                  <ul className="space-y-1">
                    {plan.features?.slice(0, 5).map((feature, i) => (
                      <li
                        key={i}
                        className="text-sm text-muted-foreground flex items-center gap-2"
                      >
                        <Check className="h-3 w-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                    {(plan.features?.length || 0) > 5 && (
                      <li className="text-sm text-muted-foreground">
                        +{(plan.features?.length || 0) - 5} további...
                      </li>
                    )}
                  </ul>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Stripe: {plan.stripe_price_id || "Nincs összekötve"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Limit: {plan.projectLimit === "unlimited" ? "∞" : plan.projectLimit} projekt,{" "}
                    {plan.monthlyWordLimit === "unlimited"
                      ? "∞"
                      : (plan.monthlyWordLimit as number)?.toLocaleString()}{" "}
                    szó/hó
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Plan Modal */}
      <EditPlanModal
        plan={editingPlan}
        onClose={() => setEditingPlan(null)}
        onSave={() => {
          refetch();
          setEditingPlan(null);
        }}
      />
    </div>
  );
}
