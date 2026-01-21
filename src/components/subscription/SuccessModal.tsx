import { PartyPopper, Mail, Calendar, Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuccessModal({ open, onOpenChange }: SuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <PartyPopper className="h-8 w-8 text-success" />
          </div>
          <DialogTitle className="text-2xl">
            Köszönjük! Alapító Tag lettél 🎉
          </DialogTitle>
          <DialogDescription className="text-base">
            Sikeresen lefogtaltad a helyed az Alapító programban!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
            <Calendar className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Mikor indul?</p>
              <p className="text-sm text-muted-foreground">
                Február elején megkapod a teljes hozzáférést emailben.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
            <Mail className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Értesítünk</p>
              <p className="text-sm text-muted-foreground">
                Az indulásról és az első lépésekről emailben tájékoztatunk.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
            <Gift className="mt-0.5 h-5 w-5 text-secondary" />
            <div>
              <p className="font-medium text-foreground">Alapító előnyök</p>
              <p className="text-sm text-muted-foreground">
                50% kedvezmény 1 évre, örök "Alapító" badge, és prioritásos támogatás.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Rendben, várom!
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            A számládat emailben megkapod.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
