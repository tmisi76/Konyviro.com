import { useState } from "react";
import { MoreVertical, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AdultBadge } from "@/components/ui/adult-badge";

export interface Project {
  id: string;
  title: string;
  genre: "szakkönyv" | "fiction" | "erotikus" | "egyéb";
  wordCount: number;
  targetWordCount: number;
  lastEditedAt: Date;
}

interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const genreConfig: Record<Project["genre"], { label: string; className: string }> = {
  szakkönyv: {
    label: "Szakkönyv",
    className: "bg-accent/15 text-accent border-accent/30",
  },
  fiction: {
    label: "Fiction",
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
  },
  erotikus: {
    label: "Erotikus",
    className: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700",
  },
  egyéb: {
    label: "Egyéb",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  if (diffInMinutes < 1) return "Most";
  if (diffInMinutes < 60) return `${diffInMinutes} perce`;
  if (diffInHours < 24) return `${diffInHours} órája`;
  if (diffInDays === 1) return "Tegnap";
  if (diffInDays < 7) return `${diffInDays} napja`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} hete`;
  return `${Math.floor(diffInDays / 30)} hónapja`;
}

export function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const progress = Math.min(
    Math.round((project.wordCount / project.targetWordCount) * 100),
    100
  );
  const genre = genreConfig[project.genre];
  const isAdultContent = project.genre === "erotikus";

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-card p-5 transition-all duration-200",
        isHovered ? "shadow-md" : "shadow-sm"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with genre badge and menu */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
              genre.className
            )}
          >
            {genre.label}
          </span>
          {isAdultContent && <AdultBadge />}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpen(project.id)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Megnyitás
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(project.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Törlés
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-foreground line-clamp-2">
        {project.title}
      </h3>

      {/* Word count */}
      <p className="mb-4 text-sm text-muted-foreground">
        {project.wordCount.toLocaleString("hu-HU")} /{" "}
        {project.targetWordCount.toLocaleString("hu-HU")} szó
      </p>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Haladás</span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Last edited */}
      <p className="text-xs text-muted-foreground">
        Utoljára szerkesztve: {formatRelativeTime(project.lastEditedAt)}
      </p>

      {/* Hover overlay for quick action */}
      <button
        onClick={() => onOpen(project.id)}
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-xl bg-foreground/5 opacity-0 transition-opacity",
          isHovered && "opacity-100"
        )}
        aria-label="Megnyitás"
      />
    </div>
  );
}
