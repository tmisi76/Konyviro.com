import { ReactNode } from "react";
import { BookOpen, FileText, Users, Library, Search, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateType = "projects" | "chapters" | "characters" | "sources" | "search" | "generic";

interface IllustratedEmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

const illustrations: Record<EmptyStateType, { icon: typeof BookOpen; color: string }> = {
  projects: { icon: FolderOpen, color: "text-primary" },
  chapters: { icon: FileText, color: "text-accent" },
  characters: { icon: Users, color: "text-secondary" },
  sources: { icon: Library, color: "text-success" },
  search: { icon: Search, color: "text-muted-foreground" },
  generic: { icon: BookOpen, color: "text-primary" },
};

const defaultContent: Record<EmptyStateType, { title: string; description: string }> = {
  projects: {
    title: "Még nincs projekted",
    description: "Kezdj el írni! Hozd létre az első könyved és indulj útnak az írás világában.",
  },
  chapters: {
    title: "Nincs még fejezet",
    description: "Add hozzá az első fejezetet, és kezd el építeni a történeted struktúráját.",
  },
  characters: {
    title: "Nincsenek karakterek",
    description: "Hozd létre a karaktereidet, hogy életre keltsd a történeted szereplőit.",
  },
  sources: {
    title: "Nincsenek források",
    description: "Adj hozzá kutatási forrásokat, hogy alátámaszd a munkádat hivatkozásokkal.",
  },
  search: {
    title: "Nincs találat",
    description: "Próbálj más keresési kifejezést, vagy módosítsd a szűrőket.",
  },
  generic: {
    title: "Nincs megjeleníthető tartalom",
    description: "Kezdj el valamit hozzáadni ehhez a részhez.",
  },
};

export function IllustratedEmptyState({
  type,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
}: IllustratedEmptyStateProps) {
  const { icon: Icon, color } = illustrations[type];
  const content = defaultContent[type];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 px-8 py-12 text-center animate-fade-in",
        className
      )}
    >
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Icon className={cn("h-10 w-10", color)} />
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary/20 animate-pulse" />
        <div className="absolute -bottom-1 -left-3 h-4 w-4 rounded-full bg-secondary/30 animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Text */}
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        {title || content.title}
      </h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        {description || content.description}
      </p>

      {/* Actions */}
      {(action || secondaryAction || children) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
