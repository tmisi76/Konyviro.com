import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Chapter } from "@/types/editor";

interface ChapterSidebarProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  onSelectChapter: (id: string) => void;
  onCreateChapter: () => void;
  onUpdateChapter: (id: string, updates: Partial<Chapter>) => void;
  onDeleteChapter: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ChapterSidebar({
  chapters,
  activeChapterId,
  onSelectChapter,
  onCreateChapter,
  onUpdateChapter,
  onDeleteChapter,
  isCollapsed,
  onToggleCollapse,
}: ChapterSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleStartEdit = (chapter: Chapter) => {
    setEditingId(chapter.id);
    setEditTitle(chapter.title);
  };

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      onUpdateChapter(id, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-sidebar-background transition-all duration-300",
        isCollapsed ? "w-12" : "w-56"
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Header */}
      <div className={cn("border-b border-border p-3", isCollapsed && "flex justify-center")}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fejezetek
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCreateChapter}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCreateChapter}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto p-2">
        {chapters.map((chapter, index) => (
          <div key={chapter.id} className="group relative mb-1">
            {editingId === chapter.id ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleSaveEdit(chapter.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit(chapter.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-8 text-sm"
                autoFocus
              />
            ) : (
              <button
                onClick={() => onSelectChapter(chapter.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  activeChapterId === chapter.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {isCollapsed ? (
                  <span className="mx-auto">{index + 1}</span>
                ) : (
                  <>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {index + 1}.
                    </span>
                    <span className="truncate">{chapter.title}</span>
                  </>
                )}
              </button>
            )}

            {!isCollapsed && editingId !== chapter.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleStartEdit(chapter)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Átnevezés
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteChapter(chapter.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Törlés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
