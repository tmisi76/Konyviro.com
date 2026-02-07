import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Ban } from "lucide-react";

interface BanReferrerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referrerEmail: string;
  banReferrer: boolean;
  selectedCount: number;
  onConfirm: (reason: string, revokeBonus: boolean) => void;
  isLoading?: boolean;
}

export function BanReferrerModal({
  open,
  onOpenChange,
  referrerEmail,
  banReferrer,
  selectedCount,
  onConfirm,
  isLoading,
}: BanReferrerModalProps) {
  const [reason, setReason] = useState("");
  const [revokeBonus, setRevokeBonus] = useState(true);

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason, revokeBonus);
    }
  };

  const totalBanned = selectedCount + (banReferrer ? 1 : 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Felhasználók tiltása
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Biztosan le szeretnéd tiltani{" "}
              <strong>{totalBanned} felhasználót</strong>?
            </p>
            {banReferrer && (
              <p className="text-destructive">
                Az ajánló ({referrerEmail}) is le lesz tiltva.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              A tiltott felhasználók nem tudnak bejelentkezni és minden
              ajánlásuk csalásként lesz megjelölve.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Tiltás oka *</Label>
            <Textarea
              id="reason"
              placeholder="Pl.: Affiliate csalás - email alias és azonos IP..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="revoke-bonus"
              checked={revokeBonus}
              onCheckedChange={(checked) => setRevokeBonus(checked as boolean)}
            />
            <Label htmlFor="revoke-bonus" className="text-sm">
              Extra szókreditek visszavonása (nullázás)
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Mégse
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            <Ban className="h-4 w-4 mr-2" />
            {isLoading ? "Tiltás..." : `${totalBanned} felhasználó tiltása`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
