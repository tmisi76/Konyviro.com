import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Mail, Loader2, Shield, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  subscription_tier: string;
  is_admin?: boolean;
}

interface SendCredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  isAdminReminder?: boolean;
  onSuccess?: () => void;
}

export function SendCredentialsModal({ 
  open, 
  onOpenChange, 
  user, 
  isAdminReminder = false,
  onSuccess 
}: SendCredentialsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [generateNewPassword, setGenerateNewPassword] = useState(true);
  const [customMessage, setCustomMessage] = useState("");

  const handleSend = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-credentials", {
        body: {
          user_id: user.user_id,
          generate_new_password: isAdminReminder ? false : generateNewPassword,
          is_admin_reminder: isAdminReminder,
          custom_message: customMessage,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        isAdminReminder 
          ? "Admin emlékeztető sikeresen elküldve!" 
          : "Belépési adatok sikeresen elküldve!"
      );
      
      setCustomMessage("");
      setGenerateNewPassword(true);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error sending credentials:", error);
      toast.error(error.message || "Hiba történt az email küldésekor");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const tierLabels: Record<string, string> = {
    free: "Ingyenes",
    hobby: "Hobbi",
    writer: "Író",
    pro: "Pro",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAdminReminder ? (
              <>
                <Shield className="h-5 w-5 text-destructive" />
                Admin emlékeztető küldése
              </>
            ) : (
              <>
                <KeyRound className="h-5 w-5 text-primary" />
                Belépési adatok küldése
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isAdminReminder 
              ? "Emlékeztető email küldése az admin hozzáférésről."
              : "Új jelszó generálása és belépési adatok küldése emailben."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="flex-1">
              <p className="font-medium">{user.full_name || user.email}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-3 w-3" />
                {user.email}
              </p>
            </div>
            <Badge variant="secondary">
              {tierLabels[user.subscription_tier] || user.subscription_tier}
            </Badge>
          </div>

          {/* Warning for password reset */}
          {!isAdminReminder && generateNewPassword && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  Figyelem: új jelszó generálása
                </p>
                <p className="text-orange-700 dark:text-orange-300">
                  A felhasználó jelenlegi jelszava érvényét veszti, és az új jelszóval kell bejelentkeznie.
                </p>
              </div>
            </div>
          )}

          {/* Options */}
          {!isAdminReminder && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generate-password"
                checked={generateNewPassword}
                onCheckedChange={(checked) => setGenerateNewPassword(checked === true)}
              />
              <Label htmlFor="generate-password" className="font-normal cursor-pointer">
                Új jelszó generálása és küldése
              </Label>
            </div>
          )}

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="custom-message">
              Egyedi üzenet (opcionális)
            </Label>
            <Textarea
              id="custom-message"
              placeholder="Pl. Kérlek nézd meg az új funkciókat..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Mégse
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isLoading}
            variant={isAdminReminder ? "destructive" : "default"}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isAdminReminder ? "Emlékeztető küldése" : "Belépési adatok küldése"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
