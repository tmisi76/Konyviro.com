import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface AgeVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AgeVerificationModal({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isLoading = false,
}: AgeVerificationModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await onConfirm();
    setIsSubmitting(false);
    setIsChecked(false);
  };

  const handleCancel = () => {
    setIsChecked(false);
    onCancel();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsChecked(false);
      onCancel();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl">
            Felnőtt tartalom figyelmeztetés
          </DialogTitle>
          <DialogDescription className="text-center">
            Az erotikus könyvírás funkció kizárólag 18 éven felüliek számára
            érhető el. A tartalom felnőtt témákat tartalmazhat.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              id="age-verification"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="age-verification"
              className="cursor-pointer text-sm leading-relaxed text-foreground"
            >
              Elmúltam 18 éves és elfogadom a{" "}
              <a
                href="#"
                className="text-primary underline hover:no-underline"
                onClick={(e) => e.preventDefault()}
              >
                felhasználási feltételeket
              </a>
            </Label>
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="flex-1"
            disabled={isSubmitting || isLoading}
          >
            Mégsem
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isChecked || isSubmitting || isLoading}
            className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {isSubmitting ? "Megerősítés..." : "Megerősítem"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
