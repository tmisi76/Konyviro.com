import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";
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
  onCancel: () => void;
}

export function CancelSubscriptionModal({
  open,
  onOpenChange,
  subscriptionEnd,
  onCancel,
}: CancelSubscriptionModalProps) {
  const endDate = subscriptionEnd
    ? format(new Date(subscriptionEnd), "yyyy. MMMM d.", { locale: hu })
    : "a jelenlegi időszak végéig";

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
          <AlertDialogCancel>Mégsem</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              onOpenChange(false);
              onCancel();
            }}
          >
            Igen, lemondom
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
