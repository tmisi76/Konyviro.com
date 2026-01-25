import { useState } from "react";
import { toast } from "sonner";
import { User, Mail, Key, CreditCard, Calendar, FileText, Copy, Eye, EyeOff, RefreshCw, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TIER_INFO = {
  free: { name: "Ingyenes", wordLimit: 1000, projectLimit: 1 },
  hobby: { name: "Hobbi", wordLimit: 50000, projectLimit: 1 },
  writer: { name: "Író", wordLimit: 200000, projectLimit: 5 },
  pro: { name: "Pro", wordLimit: 999999999, projectLimit: 999 },
};

function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function AddUserModal({ open, onOpenChange, onSuccess }: AddUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [billingPeriod, setBillingPeriod] = useState<string>("monthly");
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [passwordMode, setPasswordMode] = useState<"email" | "manual">("email");
  const [manualPassword, setManualPassword] = useState("");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [adminNotes, setAdminNotes] = useState("");

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setSubscriptionTier("free");
    setBillingPeriod("monthly");
    setPaymentMethod("bank_transfer");
    setPasswordMode("email");
    setManualPassword("");
    setSendWelcomeEmail(true);
    setAdminNotes("");
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setManualPassword(newPassword);
    setPasswordMode("manual");
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(manualPassword);
    toast.success("Jelszó vágólapra másolva!");
  };

  const handleSubmit = async () => {
    if (!email) {
      toast.error("Email cím megadása kötelező!");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email,
          full_name: fullName,
          password: passwordMode === "manual" ? manualPassword : undefined,
          subscription_tier: subscriptionTier,
          billing_period: billingPeriod,
          payment_method: paymentMethod,
          send_welcome_email: sendWelcomeEmail,
          send_password_email: passwordMode === "email",
          admin_notes: adminNotes,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Felhasználó sikeresen létrehozva!");
      
      // Show password if it was generated
      if (data?.password) {
        toast.info(`Generált jelszó: ${data.password}`, { duration: 10000 });
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Hiba történt a felhasználó létrehozásakor");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTier = TIER_INFO[subscriptionTier as keyof typeof TIER_INFO];
  const yearlyCredits = billingPeriod === "yearly" && subscriptionTier !== "free" 
    ? selectedTier.wordLimit * 12 
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Új felhasználó hozzáadása
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="pelda@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Teljes név</Label>
              <Input
                id="fullName"
                placeholder="Kiss János"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Subscription Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Előfizetés beállítása
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Csomag</Label>
                <Select value={subscriptionTier} onValueChange={setSubscriptionTier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Ingyenes</SelectItem>
                    <SelectItem value="hobby">Hobbi</SelectItem>
                    <SelectItem value="writer">Író</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Időszak</Label>
                <Select value={billingPeriod} onValueChange={setBillingPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Havi</SelectItem>
                    <SelectItem value="yearly">Éves (12 hó)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fizetési mód</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe (kártya)</SelectItem>
                  <SelectItem value="bank_transfer">Banki utalás</SelectItem>
                  <SelectItem value="cash">Készpénz</SelectItem>
                  <SelectItem value="gift">Ajándék</SelectItem>
                  <SelectItem value="manual">Egyéb / Manuális</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {yearlyCredits && (
              <div className="rounded-lg bg-primary/10 p-3 text-sm">
                <Calendar className="inline h-4 w-4 mr-2" />
                Éves előfizetésnél a teljes évi kredit ({yearlyCredits.toLocaleString()} szó) 
                egyben kerül jóváírásra.
              </div>
            )}
          </div>

          <Separator />

          {/* Password Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              Jelszó beállítása
            </h4>

            <RadioGroup value={passwordMode} onValueChange={(v) => setPasswordMode(v as "email" | "manual")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="password-email" />
                <Label htmlFor="password-email" className="font-normal cursor-pointer">
                  Jelszó beállító email küldése (ajánlott)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="password-manual" />
                <Label htmlFor="password-manual" className="font-normal cursor-pointer">
                  Jelszó megadása kézzel
                </Label>
              </div>
            </RadioGroup>

            {passwordMode === "manual" && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Jelszó"
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-8 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={copyPassword}
                    disabled={!manualPassword}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generálás
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Email & Notes */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="welcome-email"
                checked={sendWelcomeEmail}
                onCheckedChange={(checked) => setSendWelcomeEmail(checked === true)}
              />
              <Label htmlFor="welcome-email" className="font-normal cursor-pointer">
                Üdvözlő email küldése
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Admin megjegyzés (belső használatra)
              </Label>
              <Textarea
                id="admin-notes"
                placeholder="Pl. 2024.01.25 - Kifizette 1 évre utalással"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Mégse
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Létrehozás
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
