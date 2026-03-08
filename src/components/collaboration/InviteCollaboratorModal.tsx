import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { useCollaborators } from "@/hooks/useCollaborators";

interface InviteCollaboratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function InviteCollaboratorModal({ open, onOpenChange, projectId }: InviteCollaboratorModalProps) {
  const { inviteCollaborator, isInviting } = useCollaborators(projectId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "reader">("reader");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await inviteCollaborator({ email, role });
    setEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Együttműködő meghívása
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email cím</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="pelda@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Szerepkör</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "editor" | "reader")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reader">Olvasó – csak megtekintheti</SelectItem>
                <SelectItem value="editor">Szerkesztő – szerkesztheti is</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={isInviting}>
            {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Meghívás
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
