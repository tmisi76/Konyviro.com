import { Users, Trash2, Crown, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCollaborators } from "@/hooks/useCollaborators";

interface CollaboratorsListProps {
  projectId: string;
}

export function CollaboratorsList({ projectId }: CollaboratorsListProps) {
  const { collaborators, isLoading, removeCollaborator, updateRole } = useCollaborators(projectId);

  if (isLoading) return null;
  if (collaborators.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Users className="h-4 w-4" />
        Együttműködők ({collaborators.length})
      </div>
      {collaborators.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {c.invited_email?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-sm">{c.invited_email || "Ismeretlen"}</p>
              <Badge variant="outline" className="text-xs">
                {c.role === "editor" ? (
                  <><Pencil className="mr-1 h-2.5 w-2.5" /> Szerkesztő</>
                ) : (
                  <><Eye className="mr-1 h-2.5 w-2.5" /> Olvasó</>
                )}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateRole({ id: c.id, role: c.role === "editor" ? "reader" : "editor" })}
            >
              {c.role === "editor" ? <Eye className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => removeCollaborator(c.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
