import { useState, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight, GripVertical, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { Chapter, ChapterStatus } from "@/types/editor";
import { STATUS_COLORS } from "@/types/editor";
import { useChapterProofreading, calculateChapterCredits } from "@/hooks/useChapterProofreading";
import { useSubscription } from "@/hooks/useSubscription";

interface ChapterSidebarProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  onSelectChapter: (id: string) => void;
  onCreateChapter: (title?: string) => void;
  onUpdateChapter: (id: string, updates: Partial<Chapter>) => void;
  onDeleteChapter: (id: string) => void;
  onDuplicateChapter: (id: string) => void;
  onReorderChapters: (chapters: Chapter[]) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRefreshChapter?: () => Promise<void>;
}

export function ChapterSidebar({
  chapters,
  activeChapterId,
  onSelectChapter,
  onCreateChapter,
  onUpdateChapter,
  onDeleteChapter,
  onDuplicateChapter,
  onReorderChapters,
  isCollapsed,
  onToggleCollapse,
  onRefreshChapter,
}: ChapterSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);
  
  // Proofreading state
  const [proofreadingChapter, setProofreadingChapter] = useState<Chapter | null>(null);
  const { proofreadChapter, isProofreading, streamedContent, progress: proofProgress, reset } = useChapterProofreading();
  const { getRemainingWords } = useSubscription();

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

  const handleDragStart = (e: React.DragEvent, chapterId: string) => {
    setDraggedId(chapterId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, chapterId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== chapterId) {
      dragOverIdRef.current = chapterId;
    }
  };

  const handleDragEnd = () => {
    if (draggedId && dragOverIdRef.current) {
      const draggedIndex = chapters.findIndex((c) => c.id === draggedId);
      const targetIndex = chapters.findIndex((c) => c.id === dragOverIdRef.current);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newChapters = [...chapters];
        const [removed] = newChapters.splice(draggedIndex, 1);
        newChapters.splice(targetIndex, 0, removed);
        
        const reordered = newChapters.map((c, i) => ({ ...c, sort_order: i }));
        onReorderChapters(reordered);
      }
    }
    setDraggedId(null);
    dragOverIdRef.current = null;
  };

  const handleProofreadChapter = (chapter: Chapter) => {
    setProofreadingChapter(chapter);
  };

  const handleConfirmProofreading = async () => {
    if (!proofreadingChapter) return;
    
    const success = await proofreadChapter(proofreadingChapter.id, proofreadingChapter.word_count);
    
    if (success && onRefreshChapter) {
      await onRefreshChapter();
    }
  };

  const handleCloseProofreadingDialog = async () => {
    if (!isProofreading) {
      // If proofreading completed (streamedContent exists), refresh the chapter data
      if (streamedContent && onRefreshChapter) {
        await onRefreshChapter();
      }
      setProofreadingChapter(null);
      reset();
    }
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const getCreditsInfo = (wordCount: number) => {
    const needed = calculateChapterCredits(wordCount);
    const available = getRemainingWords();
    return { needed, available, hasEnough: available >= needed };
  };

  return (
    <>
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
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onCreateChapter()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCreateChapter()}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Chapter list */}
        <div className="flex-1 overflow-y-auto p-2">
          {chapters.map((chapter, index) => (
            <ContextMenu key={chapter.id}>
              <ContextMenuTrigger>
                <div
                  className={cn(
                    "group relative mb-1 rounded-md transition-all",
                    draggedId === chapter.id && "opacity-50"
                  )}
                  draggable={!editingId}
                  onDragStart={(e) => handleDragStart(e, chapter.id)}
                  onDragOver={(e) => handleDragOver(e, chapter.id)}
                  onDragEnd={handleDragEnd}
                >
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
                      {/* Drag handle */}
                      {!isCollapsed && (
                        <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100" />
                      )}
                      
                      {isCollapsed ? (
                        <div className="mx-auto flex flex-col items-center">
                          <span>{index + 1}</span>
                          <div className={cn("mt-1 h-1.5 w-1.5 rounded-full", STATUS_COLORS[chapter.status as ChapterStatus])} />
                        </div>
                      ) : (
                        <>
                          {/* Status dot */}
                          <div className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_COLORS[chapter.status as ChapterStatus])} />
                          
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {index + 1}.
                          </span>
                          <span className="flex-1 truncate">{chapter.title}</span>
                          
                          {/* Word count badge */}
                          {chapter.word_count > 0 && (
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {formatWordCount(chapter.word_count)}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleStartEdit(chapter)}>
                  Átnevezés
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onDuplicateChapter(chapter.id)}>
                  Duplikálás
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem 
                  onClick={() => handleProofreadChapter(chapter)}
                  disabled={chapter.word_count < 50}
                  className="text-primary focus:text-primary"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Fejezet lektorálása
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => onDeleteChapter(chapter.id)}
                  className="text-destructive focus:text-destructive"
                >
                  Törlés
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </aside>

      {/* Proofreading Dialog */}
      <Dialog open={!!proofreadingChapter} onOpenChange={(open) => !open && handleCloseProofreadingDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Fejezet Lektorálása
            </DialogTitle>
            <DialogDescription>
              <Badge variant="outline" className="gap-1 mt-1">
                Gemini 2.5 Pro
              </Badge>
            </DialogDescription>
          </DialogHeader>
          
          {proofreadingChapter && !isProofreading && !streamedContent && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-medium">{proofreadingChapter.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {proofreadingChapter.word_count.toLocaleString()} szó
                </p>
              </div>
              
              {(() => {
                const { needed, available, hasEnough } = getCreditsInfo(proofreadingChapter.word_count);
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Szükséges kredit:</span>
                      <span className="font-medium">{needed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Elérhető kredit:</span>
                      <span className={cn("font-medium", hasEnough ? "text-green-600" : "text-destructive")}>
                        {available.toLocaleString()}
                      </span>
                    </div>
                    {!hasEnough && (
                      <p className="text-sm text-destructive mt-2">
                        Nincs elég kredit a lektoráláshoz.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {isProofreading && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm">Lektorálás folyamatban...</span>
              </div>
              <Progress value={proofProgress} className="h-2" />
              {streamedContent && (
                <div className="max-h-60 overflow-y-auto rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="whitespace-pre-wrap">{streamedContent.slice(-500)}...</p>
                </div>
              )}
            </div>
          )}

          {!isProofreading && streamedContent && (
            <div className="space-y-2">
              <p className="text-sm text-green-600 font-medium">✓ Lektorálás befejezve!</p>
              <p className="text-sm text-muted-foreground">
                A fejezet tartalma frissült a lektorált verzióra.
              </p>
            </div>
          )}

          <DialogFooter>
            {!isProofreading && !streamedContent && proofreadingChapter && (
              <>
                <Button variant="outline" onClick={handleCloseProofreadingDialog}>
                  Mégse
                </Button>
                <Button 
                  onClick={handleConfirmProofreading}
                  disabled={!getCreditsInfo(proofreadingChapter.word_count).hasEnough}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Lektorálás
                </Button>
              </>
            )}
            {!isProofreading && streamedContent && (
              <Button onClick={handleCloseProofreadingDialog}>
                Bezárás
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
