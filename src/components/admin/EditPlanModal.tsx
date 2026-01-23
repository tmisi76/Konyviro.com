import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { AdminPlan } from "@/hooks/admin/useSubscriptionPlans";

const formSchema = z.object({
  name: z.string().min(1, "Név megadása kötelező"),
  description: z.string().min(1, "Leírás megadása kötelező"),
  price_monthly: z.number().min(0, "Érvényes ár szükséges"),
  price_yearly: z.number().min(0, "Érvényes ár szükséges"),
  project_limit: z.number().min(1, "Legalább 1 projekt szükséges"),
  monthly_word_limit: z.number().min(0, "Érvényes limit szükséges"),
  stripe_monthly_price_id: z.string().optional(),
  stripe_yearly_price_id: z.string().optional(),
  is_active: z.boolean(),
  is_popular: z.boolean(),
  features: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

interface EditPlanModalProps {
  plan: Partial<AdminPlan> | null;
  onClose: () => void;
  onSave: () => void;
}

export function EditPlanModal({ plan, onClose, onSave }: EditPlanModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newFeature, setNewFeature] = useState("");
  const isNew = !plan?.id;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price_monthly: 0,
      price_yearly: 0,
      project_limit: 1,
      monthly_word_limit: 10000,
      stripe_monthly_price_id: "",
      stripe_yearly_price_id: "",
      is_active: true,
      is_popular: false,
      features: [],
    },
  });

  useEffect(() => {
    if (plan) {
      form.reset({
        name: plan.name || "",
        description: plan.description || "",
        price_monthly: plan.price_monthly || 0,
        price_yearly: plan.price_yearly || 0,
        project_limit: typeof plan.projectLimit === 'number' ? plan.projectLimit : 1,
        monthly_word_limit: typeof plan.monthlyWordLimit === 'number' ? plan.monthlyWordLimit : 10000,
        stripe_monthly_price_id: plan.monthlyPriceId || "",
        stripe_yearly_price_id: plan.yearlyPriceId || "",
        is_active: plan.is_active ?? true,
        is_popular: plan.isPopular ?? false,
        features: plan.features || [],
      });
    }
  }, [plan, form]);

  const features = form.watch("features");

  const addFeature = () => {
    if (newFeature.trim()) {
      form.setValue("features", [...features, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    form.setValue("features", features.filter((_, i) => i !== index));
  };

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      // In a real app, save to database
      console.log("Saving plan:", data);
      toast.success(isNew ? "Csomag létrehozva!" : "Csomag mentve!");
      onSave();
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={!!plan} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Új csomag létrehozása" : `${plan?.name} szerkesztése`}
          </DialogTitle>
          <DialogDescription>
            Állítsd be a csomag részleteit és árazását.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Csomag neve</FormLabel>
                    <FormControl>
                      <Input placeholder="pl. Profi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rövid leírás</FormLabel>
                    <FormControl>
                      <Input placeholder="pl. Profi íróknak" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price_monthly"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Havi ár (Ft)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_yearly"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Éves ár (Ft)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="project_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projekt limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>0 = korlátlan</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthly_word_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Havi szó limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>0 = korlátlan</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stripe_monthly_price_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stripe havi Price ID</FormLabel>
                    <FormControl>
                      <Input placeholder="price_..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stripe_yearly_price_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stripe éves Price ID</FormLabel>
                    <FormControl>
                      <Input placeholder="price_..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Features */}
            <FormField
              control={form.control}
              name="features"
              render={() => (
                <FormItem>
                  <FormLabel>Funkciók</FormLabel>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Új funkció hozzáadása..."
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addFeature();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={addFeature}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {features.map((feature, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {feature}
                          <button
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Aktív</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_popular"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Népszerű badge</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Mégse
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isNew ? "Létrehozás" : "Mentés"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
