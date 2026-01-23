import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, ArrowLeft, ArrowRight, Mail } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { EmailTemplate } from "@/hooks/admin/useEmailTemplates";

interface BulkEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates?: EmailTemplate[];
}

export function BulkEmailModal({
  open,
  onOpenChange,
  templates,
}: BulkEmailModalProps) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [recipients, setRecipients] = useState<"all" | "plan" | "custom">("all");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [customEmails, setCustomEmails] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  const marketingTemplates = templates?.filter((t) => t.category === "marketing") || [];

  const getRecipientCount = () => {
    if (recipients === "custom") {
      return customEmails.split("\n").filter(Boolean).length;
    }
    return "?"; // Would need to fetch from DB
  };

  async function handleSend() {
    if (!selectedTemplate) return;

    setIsSending(true);
    setSendProgress(0);
    setSendResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-bulk-email", {
        body: {
          templateId: selectedTemplate.id,
          recipientType: recipients,
          selectedPlan: recipients === "plan" ? selectedPlan : undefined,
          customEmails: recipients === "custom" ? customEmails.split("\n").filter(Boolean) : undefined,
        },
      });

      if (error) throw error;

      // Simulate progress for UX
      for (let i = 0; i <= 100; i += 10) {
        setSendProgress(i);
        await new Promise((r) => setTimeout(r, 200));
      }

      setSendResult(data);
      toast.success(`Email elküldve ${data.sent} címzettnek!`);
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    } finally {
      setIsSending(false);
    }
  }

  const resetAndClose = () => {
    setStep(1);
    setSelectedTemplate(null);
    setRecipients("all");
    setSelectedPlan("");
    setCustomEmails("");
    setSendProgress(0);
    setSendResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Tömeges email küldés
          </DialogTitle>
          <DialogDescription>
            Email küldése több felhasználónak egyszerre
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "w-12 h-0.5",
                    step > s ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-medium">Válassz sablont</h3>
            {marketingTemplates.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nincs elérhető marketing sablon. Hozz létre egyet először.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {marketingTemplates.map((template) => (
                  <button
                    key={template.id}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-colors",
                      selectedTemplate?.id === template.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {template.subject}
                    </p>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!selectedTemplate}>
                Tovább
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-medium">Válassz címzetteket</h3>
            <RadioGroup
              value={recipients}
              onValueChange={(v) => setRecipients(v as typeof recipients)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">Minden felhasználó</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="plan" id="plan" />
                <Label htmlFor="plan">Adott csomag előfizetői</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Egyéni lista</Label>
              </div>
            </RadioGroup>

            {recipients === "plan" && (
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz csomagot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Ingyenes</SelectItem>
                  <SelectItem value="hobby">Hobbi</SelectItem>
                  <SelectItem value="writer">Író</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            )}

            {recipients === "custom" && (
              <Textarea
                placeholder="Email címek, soronként egy..."
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                rows={5}
              />
            )}

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vissza
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={recipients === "plan" && !selectedPlan}
              >
                Tovább
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium">Összegzés és küldés</h3>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p>
                <strong>Sablon:</strong> {selectedTemplate?.name}
              </p>
              <p>
                <strong>Tárgy:</strong> {selectedTemplate?.subject}
              </p>
              <p>
                <strong>Címzettek:</strong>{" "}
                {recipients === "all"
                  ? "Minden felhasználó"
                  : recipients === "plan"
                  ? `${selectedPlan} csomag előfizetői`
                  : `${getRecipientCount()} egyéni cím`}
              </p>
            </div>

            {isSending && (
              <div className="space-y-2">
                <Progress value={sendProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Küldés folyamatban... {sendProgress}%
                </p>
              </div>
            )}

            {sendResult && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-500 font-medium">
                  ✓ Küldés befejezve: {sendResult.sent} sikeres
                  {sendResult.failed > 0 && `, ${sendResult.failed} sikertelen`}
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={isSending}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vissza
              </Button>
              {!sendResult ? (
                <Button onClick={handleSend} disabled={isSending}>
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Küldés...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Küldés indítása
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={resetAndClose}>Bezárás</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
