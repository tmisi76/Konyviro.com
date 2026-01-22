import { useState, useEffect } from "react";
import { MoreVertical, ExternalLink, Trash2, Loader2, Cloud, CheckCircle, AlertCircle, Archive, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AdultBadge } from "@/components/ui/adult-badge";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface Project {
  id: string;
  title: string;
  genre: "szakkönyv" | "fiction" | "erotikus" | "egyéb";
  wordCount: number;
  targetWordCount: number;
  lastEditedAt: Date;
  writingStatus?: string | null;
  writingMode?: string | null;
  backgroundError?: string | null;
}

interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
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

export function ProjectCard({ project, onOpen, onDelete, onArchive }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [liveWordCount, setLiveWordCount] = useState(project.wordCount);
  const [liveStatus, setLiveStatus] = useState(project.writingStatus);
  
  const isBackgroundWriting = liveStatus === "background_writing";
  const isCompleted = liveStatus === "completed";
  const hasFailed = liveStatus === "failed";
  
  const progress = Math.min(
    Math.round((liveWordCount / project.targetWordCount) * 100),
    100
  );
  const genre = genreConfig[project.genre];
  const isAdultContent = project.genre === "erotikus";

  // Poll for updates while background writing is in progress
  useEffect(() => {
    if (!isBackgroundWriting) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("projects")
        .select("word_count, writing_status")
        .eq("id", project.id)
        .single();

      if (data) {
        setLiveWordCount(data.word_count);
        setLiveStatus(data.writing_status);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isBackgroundWriting, project.id]);

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card p-5 transition-all duration-200",
        isBackgroundWriting ? "border-primary/50" : "border-border",
        isHovered ? "shadow-md" : "shadow-sm"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with genre badge and menu */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
              genre.className
            )}
          >
            {genre.label}
          </span>
          {isAdultContent && <AdultBadge />}
          
          {/* Background writing status badge */}
          {isBackgroundWriting && (
            <Badge variant="secondary" className="gap-1 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              Íródik...
            </Badge>
          )}
          {isCompleted && project.writingMode === "background" && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" />
              Kész
            </Badge>
          )}
          {hasFailed && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Hiba
            </Badge>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 relative z-10"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpen(project.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Szerkesztés
            </DropdownMenuItem>
            {onArchive && (
              <DropdownMenuItem onClick={() => onArchive(project.id)}>
                <Archive className="mr-2 h-4 w-4" />
                Archiválás
              </DropdownMenuItem>
            )}
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

      {/* Background writing indicator */}
      {isBackgroundWriting && (
        <div className="mb-3 flex items-center gap-2 text-sm text-primary">
          <Cloud className="h-4 w-4" />
          <span>Háttérben íródik...</span>
        </div>
      )}

      {/* Word count */}
      <p className="mb-4 text-sm text-muted-foreground">
        {liveWordCount.toLocaleString("hu-HU")} /{" "}
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
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isBackgroundWriting ? "bg-primary animate-pulse" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Error message if failed */}
      {hasFailed && project.backgroundError && (
        <p className="mb-3 text-xs text-destructive">
          {project.backgroundError}
        </p>
      )}

      {/* Last edited */}
      <p className="text-xs text-muted-foreground">
        Utoljára szerkesztve: {formatRelativeTime(project.lastEditedAt)}
      </p>

      {/* Hover overlay for quick action - excludes header area */}
      <button
        onClick={() => onOpen(project.id)}
        className={cn(
          "absolute inset-x-0 top-14 bottom-0 flex items-center justify-center rounded-b-xl bg-foreground/5 opacity-0 transition-opacity",
          isHovered && "opacity-100"
        )}
        aria-label="Megnyitás"
      />
    </div>
  );
}
