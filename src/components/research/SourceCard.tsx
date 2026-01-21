import { Star, ExternalLink, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Source } from "@/types/research";
import { SOURCE_TYPE_LABELS, SOURCE_TYPE_COLORS } from "@/types/research";

interface SourceCardProps {
  source: Source;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}

export function SourceCard({ source, onEdit, onDelete, onToggleStar }: SourceCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
      {/* Star button */}
      <button
        onClick={onToggleStar}
        className="absolute right-12 top-4"
      >
        <Star
          className={cn(
            "h-4 w-4 transition-colors",
            source.is_starred
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground hover:text-yellow-400"
          )}
        />
      </button>

      {/* Menu button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="mr-2 h-4 w-4" />
            Szerkesztés
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Törlés
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Type badge */}
      <Badge
        variant="secondary"
        className={cn("mb-2", SOURCE_TYPE_COLORS[source.source_type])}
      >
        {SOURCE_TYPE_LABELS[source.source_type]}
      </Badge>

      {/* Title */}
      <h3 className="mb-1 line-clamp-2 pr-12 font-medium text-foreground">
        {source.title}
      </h3>

      {/* Author */}
      {source.author && (
        <p className="mb-2 text-sm text-muted-foreground">{source.author}</p>
      )}

      {/* Meta info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {source.year && <span>{source.year}</span>}
        {source.publisher && (
          <>
            <span>•</span>
            <span className="truncate">{source.publisher}</span>
          </>
        )}
      </div>

      {/* Tags */}
      {source.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {source.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* URL link */}
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Megnyitás
        </a>
      )}

      {/* Added date */}
      <p className="mt-3 text-xs text-muted-foreground">
        Hozzáadva: {formatDate(source.created_at)}
      </p>
    </div>
  );
}
