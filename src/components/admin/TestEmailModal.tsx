import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { replaceVariablesWithTestData } from "@/constants/emailVariables";

interface TestEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  bodyHtml: string;
}

export function TestEmailModal({ open, onOpenChange, subject, bodyHtml }: TestEmailModalProps) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!email) {
      toast.error("Add meg az email címet!");
      return;
    }

    setIsSending(true);
    try {
      // Replace variables with test data
      const processedSubject = replaceVariablesWithTestData(subject);
      const processedBody = replaceVariablesWithTestData(bodyHtml);

      const { error } = await supabase.functions.invoke("send-admin-email", {
        body: {
          to: email,
          subject: `[TESZT] ${processedSubject}`,
          html: processedBody,
          isTest: true,
        },
      });

      if (error) throw error;

      toast.success(`Teszt email elküldve: ${email}`);
      onOpenChange(false);
      setEmail("");
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Teszt email küldése</DialogTitle>
          <DialogDescription>
            A változók teszt értékekkel lesznek helyettesítve a küldés előtt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Címzett email cím</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="teszt@email.hu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
            <p><strong>Tárgy:</strong> [TESZT] {replaceVariablesWithTestData(subject)}</p>
            <p className="text-muted-foreground text-xs">
              A változók (pl. {`{{user_name}}`}) mintaértékekkel lesznek helyettesítve.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Mégse
          </Button>
          <Button onClick={handleSend} disabled={isSending || !email}>
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Küldés
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
