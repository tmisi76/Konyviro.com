import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, ArrowLeft, ArrowRight, Mail, Eye, Code, Check } from "lucide-react";
import DOMPurify from "dompurify";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { replaceVariablesWithTestData } from "@/constants/emailVariables";
import type { EmailTemplate } from "@/hooks/admin/useEmailTemplates";

interface BulkEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates?: EmailTemplate[];
}

const STEPS = [
  { number: 1, label: "Sablon" },
  { number: 2, label: "Címzettek" },
  { number: 3, label: "Szerkesztés" },
  { number: 4, label: "Küldés" },
];

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
  
  // Editable content (step 3)
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  const marketingTemplates = templates?.filter((t) => t.category === "marketing") || [];

  // Initialize edited content when moving to step 3
  const handleNextToStep3 = () => {
    if (selectedTemplate) {
      setEditedSubject(editedSubject || selectedTemplate.subject);
      setEditedBody(editedBody || selectedTemplate.body_html);
    }
    setStep(3);
  };

  const getRecipientCount = () => {
    if (recipients === "custom") {
      return customEmails.split("\n").filter(Boolean).length;
    }
    return "?";
  };

  const getRecipientLabel = () => {
    if (recipients === "all") return "Minden felhasználó";
    if (recipients === "plan") return `${selectedPlan} csomag előfizetői`;
    return `${getRecipientCount()} egyéni cím`;
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
          customSubject: editedSubject !== selectedTemplate.subject ? editedSubject : undefined,
          customBody: editedBody !== selectedTemplate.body_html ? editedBody : undefined,
          recipientType: recipients,
          selectedPlan: recipients === "plan" ? selectedPlan : undefined,
          customEmails: recipients === "custom" ? customEmails.split("\n").filter(Boolean) : undefined,
        },
      });

      if (error) throw error;

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
    setEditedSubject("");
    setEditedBody("");
    setShowPreview(false);
    setSendProgress(0);
    setSendResult(null);
    onOpenChange(false);
  };

  const renderPreview = () => {
    const withTestData = replaceVariablesWithTestData(editedBody);
    return DOMPurify.sanitize(withTestData);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, idx) => (
            <div key={s.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    step > s.number
                      ? "bg-green-500 text-white"
                      : step === s.number
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s.number ? <Check className="h-4 w-4" /> : s.number}
                </div>
                <span className="text-xs mt-1 text-muted-foreground">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-16 h-0.5 mx-2",
                    step > s.number ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Template Selection */}
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

        {/* Step 2: Recipients */}
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
                onClick={handleNextToStep3}
                disabled={recipients === "plan" && !selectedPlan}
              >
                Tovább
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Edit Content */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium">Tartalom szerkesztése</h3>
            
            <div className="space-y-2">
              <Label>Tárgy</Label>
              <Input
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                placeholder="Email tárgya..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email tartalom</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!showPreview ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowPreview(false)}
                  >
                    <Code className="h-4 w-4 mr-1" />
                    Szerkesztés
                  </Button>
                  <Button
                    type="button"
                    variant={showPreview ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowPreview(true)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Előnézet
                  </Button>
                </div>
              </div>

              {!showPreview ? (
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="font-mono min-h-[250px] text-sm"
                  placeholder="<h1>Szia {{user_name}}!</h1>..."
                />
              ) : (
                <div
                  className="border rounded-lg p-4 min-h-[250px] bg-white text-black overflow-auto"
                  dangerouslySetInnerHTML={{ __html: renderPreview() }}
                />
              )}
            </div>

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vissza
              </Button>
              <Button onClick={() => setStep(4)}>
                Tovább
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Summary and Send */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-medium">Összegzés és küldés</h3>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p>
                <strong>Sablon:</strong> {selectedTemplate?.name}
              </p>
              <p>
                <strong>Tárgy:</strong> {editedSubject}
              </p>
              <p>
                <strong>Címzettek:</strong> {getRecipientLabel()}
              </p>
              {editedBody !== selectedTemplate?.body_html && (
                <p className="text-sm text-amber-600">
                  ⚠️ A tartalom módosítva lett az eredeti sablonhoz képest
                </p>
              )}
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
                <p className="text-green-600 font-medium">
                  ✓ Küldés befejezve: {sendResult.sent} sikeres
                  {sendResult.failed > 0 && `, ${sendResult.failed} sikertelen`}
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
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
