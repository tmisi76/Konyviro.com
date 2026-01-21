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
import { AlertTriangle, Trash2, LogOut, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmationType = "delete" | "leave" | "cancel-subscription" | "generic";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  type?: ConfirmationType;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: "default" | "destructive";
}

const defaultContent: Record<
  ConfirmationType,
  { title: string; description: string; confirmLabel: string; icon: typeof AlertTriangle }
> = {
  delete: {
    title: "Biztosan törlöd?",
    description: "Ez a művelet nem visszavonható. Az összes adat véglegesen törlődik.",
    confirmLabel: "Törlés",
    icon: Trash2,
  },
  leave: {
    title: "Nem mentett változtatások",
    description: "Biztosan kilépsz? A nem mentett változtatásaid elvesznek.",
    confirmLabel: "Kilépés mentés nélkül",
    icon: LogOut,
  },
  "cancel-subscription": {
    title: "Előfizetés lemondása",
    description: "Biztos lemondod az előfizetésed? A jelenlegi számlázási ciklus végéig még használhatod a szolgáltatást.",
    confirmLabel: "Igen, lemondom",
    icon: CreditCard,
  },
  generic: {
    title: "Megerősítés szükséges",
    description: "Biztosan folytatod ezt a műveletet?",
    confirmLabel: "Megerősítés",
    icon: AlertTriangle,
  },
};

export function ConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  type = "generic",
  title,
  description,
  confirmLabel,
  cancelLabel = "Mégse",
  isLoading = false,
  variant = "destructive",
}: ConfirmationModalProps) {
  const content = defaultContent[type];
  const Icon = content.icon;

  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Icon className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">
            {title || content.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {description || content.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              variant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {isLoading ? "Feldolgozás..." : confirmLabel || content.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
