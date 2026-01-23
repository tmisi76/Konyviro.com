import { useState } from "react";
import { Bug, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function BugReportFab() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    category: "bug",
    priority: "medium",
  });

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error("Kérlek töltsd ki a kötelező mezőket!");
      return;
    }

    if (!user) {
      toast.error("Kérlek jelentkezz be a hibajelentéshez!");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: formData.subject,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: "open",
      });

      if (error) throw error;

      toast.success("Hibajelentés elküldve! Hamarosan foglalkozunk vele.");
      setIsOpen(false);
      setFormData({
        subject: "",
        description: "",
        category: "bug",
        priority: "medium",
      });
    } catch (error: any) {
      console.error("Error submitting bug report:", error);
      toast.error("Hiba történt a beküldés során. Próbáld újra!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
          "transition-all hover:scale-110"
        )}
        size="icon"
        title="Hibajelentés"
      >
        <Bug className="h-6 w-6" />
      </Button>

      {/* Bug Report Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-destructive" />
              Hibajelentés
            </DialogTitle>
            <DialogDescription>
              Találtál hibát? Írd le részletesen és segítünk megoldani!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Tárgy *</Label>
              <Input
                id="subject"
                placeholder="Mi a probléma röviden?"
                value={formData.subject}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subject: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategória</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Hiba / Bug</SelectItem>
                    <SelectItem value="feature">Funkció kérés</SelectItem>
                    <SelectItem value="question">Kérdés</SelectItem>
                    <SelectItem value="billing">Számlázás</SelectItem>
                    <SelectItem value="other">Egyéb</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioritás</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Alacsony</SelectItem>
                    <SelectItem value="medium">Közepes</SelectItem>
                    <SelectItem value="high">Magas</SelectItem>
                    <SelectItem value="urgent">Sürgős</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Részletes leírás *</Label>
              <Textarea
                id="description"
                placeholder="Írd le részletesen a problémát. Mit csináltál, mikor történt, milyen hibaüzenetet láttál?"
                rows={5}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <p className="text-xs text-muted-foreground">
              A rendszer automatikusan rögzíti a böngésző és platform adatait a
              könnyebb hibakeresés érdekében.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Mégse
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Küldés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
