import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  User, 
  CreditCard, 
  Settings, 
  Calendar, 
  FileText,
  Key,
  Mail,
  AlertTriangle,
  Plus,
  RotateCcw,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    subscription_tier: string;
  } | null;
  onSuccess: () => void;
}

const TIER_INFO = {
  free: { name: "Ingyenes", wordLimit: 1000, projectLimit: 1 },
  hobby: { name: "Hobbi", wordLimit: 50000, projectLimit: 1 },
  writer: { name: "Író", wordLimit: 200000, projectLimit: 5 },
  pro: { name: "Pro", wordLimit: 999999999, projectLimit: 999 },
};

export function EditUserModal({ open, onOpenChange, user, onSuccess }: EditUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Form state - Profile
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // Form state - Subscription
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyWordLimit, setMonthlyWordLimit] = useState(0);
  const [extraWordsBalance, setExtraWordsBalance] = useState(0);
  const [projectLimit, setProjectLimit] = useState(1);
  const [manualSubscription, setManualSubscription] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [addCreditsAmount, setAddCreditsAmount] = useState(50000);

  // Load user profile when modal opens
  useEffect(() => {
    if (user && open) {
      loadUserProfile();
    }
  }, [user, open]);

  async function loadUserProfile() {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setFullName(data.full_name || "");
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
      setSubscriptionTier(data.subscription_tier || "free");
      setSubscriptionStatus(data.subscription_status || "active");
      setBillingPeriod(data.billing_period || "monthly");
      setPaymentMethod(data.payment_method || "stripe");
      setStartDate(data.subscription_start_date?.split("T")[0] || "");
      setEndDate(data.subscription_end_date?.split("T")[0] || "");
      setMonthlyWordLimit(data.monthly_word_limit || 0);
      setExtraWordsBalance(data.extra_words_balance || 0);
      setProjectLimit(data.project_limit || 1);
      setManualSubscription(data.manual_subscription || false);
      setAdminNotes(data.admin_notes || "");
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          full_name: fullName,
          display_name: displayName,
          bio: bio,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Profil mentve!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Hiba történt a mentéskor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSubscription = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-subscription", {
        body: {
          user_id: user.id,
          subscription_tier: subscriptionTier,
          subscription_status: subscriptionStatus,
          billing_period: billingPeriod,
          payment_method: paymentMethod,
          subscription_start_date: startDate ? new Date(startDate).toISOString() : null,
          subscription_end_date: endDate ? new Date(endDate).toISOString() : null,
          monthly_word_limit: monthlyWordLimit,
          extra_words_balance: extraWordsBalance,
          project_limit: projectLimit,
          admin_notes: adminNotes,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Előfizetés mentve!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Hiba történt a mentéskor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCredits = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-subscription", {
        body: {
          user_id: user.id,
          add_extra_credits: addCreditsAmount,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setExtraWordsBalance((prev) => prev + addCreditsAmount);
      toast.success(`${addCreditsAmount.toLocaleString()} kredit hozzáadva!`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Hiba történt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetCredits = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-subscription", {
        body: {
          user_id: user.id,
          reset_credits: true,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setExtraWordsBalance(0);
      toast.success("Kreditek nullázva!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Hiba történt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (action: "generate_and_send" | "send_reset_link") => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: {
          user_id: user.id,
          action,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (action === "generate_and_send") {
        toast.success("Új jelszó generálva és elküldve!");
        if (data?.password) {
          toast.info(`Jelszó: ${data.password}`, { duration: 15000 });
        }
      } else {
        toast.success("Jelszó visszaállító link elküldve!");
      }
    } catch (error: any) {
      toast.error(error.message || "Hiba történt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTierChange = (tier: string) => {
    setSubscriptionTier(tier);
    const tierConfig = TIER_INFO[tier as keyof typeof TIER_INFO];
    if (tierConfig) {
      if (billingPeriod === "yearly" && tier !== "free") {
        setMonthlyWordLimit(0);
        setExtraWordsBalance(tierConfig.wordLimit * 12);
      } else {
        setMonthlyWordLimit(tierConfig.wordLimit);
      }
      setProjectLimit(tierConfig.projectLimit);
    }
  };

  const handleBillingPeriodChange = (period: string) => {
    setBillingPeriod(period);
    const tierConfig = TIER_INFO[subscriptionTier as keyof typeof TIER_INFO];
    if (tierConfig && subscriptionTier !== "free") {
      if (period === "yearly") {
        setMonthlyWordLimit(0);
        setExtraWordsBalance(tierConfig.wordLimit * 12);
      } else {
        setMonthlyWordLimit(tierConfig.wordLimit);
      }
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {user.email}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Előfizetés
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Műveletek
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Teljes név</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Teljes név"
              />
            </div>

            <div className="space-y-2">
              <Label>Megjelenítési név</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Megjelenítési név"
              />
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Rövid bemutatkozás..."
                rows={3}
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Profil mentése
            </Button>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Csomag</Label>
                <Select value={subscriptionTier} onValueChange={handleTierChange}>
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
                <Select value={billingPeriod} onValueChange={handleBillingPeriodChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Havi</SelectItem>
                    <SelectItem value="yearly">Éves</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fizetési mód</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="bank_transfer">Banki utalás</SelectItem>
                    <SelectItem value="cash">Készpénz</SelectItem>
                    <SelectItem value="gift">Ajándék</SelectItem>
                    <SelectItem value="manual">Egyéb</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Státusz</Label>
                <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktív</SelectItem>
                    <SelectItem value="cancelled">Lemondva</SelectItem>
                    <SelectItem value="expired">Lejárt</SelectItem>
                    <SelectItem value="past_due">Lejárt fizetés</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Kezdete
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Lejárat
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <h4 className="font-medium">Kreditek</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Havi limit</Label>
                <Input
                  type="number"
                  value={monthlyWordLimit}
                  onChange={(e) => setMonthlyWordLimit(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Extra egyenleg</Label>
                <Input
                  type="number"
                  value={extraWordsBalance}
                  onChange={(e) => setExtraWordsBalance(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex gap-2 items-end">
              <div className="space-y-2 flex-1">
                <Label>Kredit hozzáadása</Label>
                <Select value={addCreditsAmount.toString()} onValueChange={(v) => setAddCreditsAmount(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10000">10,000 szó</SelectItem>
                    <SelectItem value="50000">50,000 szó</SelectItem>
                    <SelectItem value="100000">100,000 szó</SelectItem>
                    <SelectItem value="200000">200,000 szó</SelectItem>
                    <SelectItem value="500000">500,000 szó</SelectItem>
                    <SelectItem value="1000000">1,000,000 szó</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={handleAddCredits} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Hozzáad
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Nulláz
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kreditek nullázása</AlertDialogTitle>
                    <AlertDialogDescription>
                      Biztosan nullázod az extra krediteket? Ez a művelet nem vonható vissza.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetCredits}>
                      Nullázás
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="space-y-2">
              <Label>Projekt limit</Label>
              <Input
                type="number"
                value={projectLimit}
                onChange={(e) => setProjectLimit(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="manual-sub"
                checked={manualSubscription}
                onCheckedChange={(checked) => setManualSubscription(checked === true)}
              />
              <Label htmlFor="manual-sub" className="font-normal">
                Manuális előfizetés (nem Stripe-ból jön)
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Admin megjegyzés
              </Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Belső megjegyzések..."
                rows={3}
              />
            </div>

            <Button onClick={handleSaveSubscription} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Előfizetés mentése
            </Button>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-6 pt-4">
            {/* Password Management */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                Jelszó kezelés
              </h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleResetPassword("send_reset_link")}
                  disabled={isLoading}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Jelszó reset link küldése
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleResetPassword("generate_and_send")}
                  disabled={isLoading}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Új jelszó generálása és küldése
                </Button>
              </div>
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Veszélyes műveletek
              </h4>
              <div className="flex flex-wrap gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive border-destructive/50">
                      Felhasználó tiltása
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Felhasználó tiltása</AlertDialogTitle>
                      <AlertDialogDescription>
                        Biztosan tiltani szeretnéd ezt a felhasználót? Nem fog tudni bejelentkezni.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Mégse</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive">
                        Tiltás
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      Felhasználó törlése
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Felhasználó törlése</AlertDialogTitle>
                      <AlertDialogDescription>
                        Biztosan törölni szeretnéd ezt a felhasználót? Ez a művelet NEM vonható vissza!
                        Minden adata törlődik.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Mégse</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive">
                        Végleges törlés
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
