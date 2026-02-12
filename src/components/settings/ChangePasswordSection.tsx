import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ChangePasswordSection() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({ title: "Az új jelszónak legalább 6 karakter hosszúnak kell lennie.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Az új jelszavak nem egyeznek.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const email = user?.email || "";
    try {
      // 1. Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        toast({ title: "A jelenlegi jelszó helytelen.", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      // 2. Wait for session to stabilize after signIn event
      await delay(500);
      await supabase.auth.getSession();

      // 3. Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast({ title: "Hiba történt a jelszó módosítása során.", description: error.message, variant: "destructive" });
        setIsSaving(false);
        return;
      }

      // 4. Success - show popup dialog
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowSuccessDialog(true);
    } catch {
      toast({ title: "Váratlan hiba történt.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-material-1">
      <h3 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
        <Lock className="h-5 w-5" />
        Jelszó módosítása
      </h3>

      <div className="space-y-4">
        {/* Current password */}
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Jelenlegi jelszó</Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div className="space-y-2">
          <Label htmlFor="newPassword">Új jelszó</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Confirm new password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Új jelszó megerősítése</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">Minimum 6 karakter</p>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mentés...
              </>
            ) : (
              "Jelszó mentése"
            )}
          </Button>
        </div>
      </div>
    </form>

    <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <AlertDialogTitle className="text-center">
            Jelszó sikeresen módosítva!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Most már az új jelszóval tud bejelentkezni.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={() => setShowSuccessDialog(false)}>
            Rendben
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
