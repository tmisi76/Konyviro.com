import { useState } from "react";
import { Loader2, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollaborators, type CollaboratorRole } from "@/hooks/useCollaborators";

const ROLE_LABELS: Record<CollaboratorRole, string> = {
  reader: "Olvasó",
  editor: "Szerkesztő",
  admin: "Adminisztrátor",
};

const ROLE_DESCRIPTIONS: Record<CollaboratorRole, string> = {
  reader: "Csak olvashatja a projektet",
  editor: "Szerkesztheti a fejezeteket",
  admin: "Teljes hozzáférés a tartalomhoz",
};

interface Props {
  projectId: string;
}

export function CollaboratorsTab({ projectId }: Props) {
  const { data: collaborators, isLoading, invite, updateRole, remove } = useCollaborators(projectId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("reader");

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    invite.mutate(
      { email: email.trim(), role },
      {
        onSuccess: () => {
          setEmail("");
          setRole("reader");
        },
      }
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="h-6 w-6" /> Csapat & Béta-olvasók
          </h2>
          <p className="text-muted-foreground mt-1">
            Hívd meg a lektorodat vagy a béta-olvasóidat közvetlenül a projektbe.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" /> Új munkatárs meghívása
            </CardTitle>
            <CardDescription>
              A meghívottnak már regisztráltnak kell lennie a KönyvÍró-n ezzel az email címmel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="email@pelda.hu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Select value={role} onValueChange={(v) => setRole(v as CollaboratorRole)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as CollaboratorRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      <div>
                        <div className="font-medium">{ROLE_LABELS[r]}</div>
                        <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={invite.isPending} className="gap-2">
                {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Meghívás
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aktuális munkatársak</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !collaborators || collaborators.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                Még nincs meghívott munkatárs ehhez a projekthez.
              </p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.invited_email ?? "Ismeretlen"}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {c.accepted_at ? (
                          <Badge variant="secondary" className="text-xs">Aktív</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Függőben</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(c.invited_at).toLocaleDateString("hu-HU")}
                        </span>
                      </div>
                    </div>
                    <Select
                      value={c.role}
                      onValueChange={(v) =>
                        updateRole.mutate({ id: c.id, role: v as CollaboratorRole })
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABELS) as CollaboratorRole[]).map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Biztosan eltávolítod ezt a munkatársat?")) {
                          remove.mutate(c.id);
                        }
                      }}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}