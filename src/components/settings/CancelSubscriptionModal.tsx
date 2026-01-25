import { useState } from "react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface CancelSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionEnd: string | null;
  onSuccess?: () => void;
}

export function CancelSubscriptionModal({
  open,
  onOpenChange,
  subscriptionEnd,
  onSuccess,
}: CancelSubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const endDate = subscriptionEnd
    ? format(new Date(subscriptionEnd), "yyyy. MMMM d.", { locale: hu })
    : "a jelenlegi időszak végéig";

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { cancelImmediately: false },
      });

      if (error) throw error;

      toast.success("Előfizetésed lemondva. A jelenlegi időszak végéig használhatod a szolgáltatást.");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Cancel subscription error:", error);
      toast.error("Hiba történt a lemondás során. Kérlek próbáld újra!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">
            Biztos lemondod az előfizetésed?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-center">
            <p>
              A jelenlegi időszak végéig ({endDate}) még használhatod a szolgáltatást.
            </p>
            <p className="font-medium text-foreground">
              ⚠️ Az alapító kedvezményed elvész, ha később újra előfizetsz.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel disabled={isLoading}>Mégsem</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Lemondás...
              </>
            ) : (
              "Igen, lemondom"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
