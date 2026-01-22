import { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  GripVertical, 
  Pencil, 
  Trash2, 
  Plus, 
  Save, 
  Rocket,
  RefreshCw,
  X,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChapterOutlineItem, Genre, BookLength } from "@/types/wizard";

interface Step6ChapterOutlineProps {
  genre: Genre;
  length: BookLength;
  detailedConcept: string;
  existingOutline: ChapterOutlineItem[];
  projectId: string | null;
  onOutlineChange: (outline: ChapterOutlineItem[]) => void;
  onSave: () => Promise<boolean>;
  onStartWriting: () => void;
  isSaving: boolean;
  isDirty: boolean;
}

export function Step6ChapterOutline({
  genre,
  length,
  detailedConcept,
  existingOutline,
  projectId,
  onOutlineChange,
  onSave,
  onStartWriting,
  isSaving,
  isDirty,
}: Step6ChapterOutlineProps) {
  const [chapters, setChapters] = useState<ChapterOutlineItem[]>(existingOutline);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ChapterOutlineItem>>({});
  const [lastConceptHash, setLastConceptHash] = useState<string | null>(null);

  const hasOutline = chapters.length > 0;

  // Sync with existingOutline prop when it changes (e.g., when cleared by wizard)
  useEffect(() => {
    setChapters(existingOutline);
  }, [existingOutline]);

  // Track concept changes - if concept changed, chapters need regeneration
  useEffect(() => {
    const currentHash = detailedConcept?.substring(0, 50);
    
    if (lastConceptHash && lastConceptHash !== currentHash && chapters.length > 0) {
      // Koncepció megváltozott, töröljük a fejezeteket
      setChapters([]);
    }
    setLastConceptHash(currentHash);
  }, [detailedConcept]);

  useEffect(() => {
    onOutlineChange(chapters);
  }, [chapters]);

  const generateOutline = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-chapter-outline", {
        body: {
          genre,
          length,
          concept: detailedConcept,
        },
      });

      if (error) throw error;
      
      setChapters(data.chapters as ChapterOutlineItem[]);
      toast.success("Fejezet struktúra generálva!");
    } catch (error) {
      console.error("Error generating outline:", error);
      toast.error("Hiba történt a fejezetek generálása során");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReorder = (newOrder: ChapterOutlineItem[]) => {
    // Update chapter numbers
    const renumbered = newOrder.map((ch, index) => ({
      ...ch,
      number: index + 1,
    }));
    setChapters(renumbered);
  };

  const startEdit = (chapter: ChapterOutlineItem) => {
    setEditingId(chapter.id);
    setEditData({
      title: chapter.title,
      description: chapter.description,
      keyPoints: [...chapter.keyPoints],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    setChapters(prev => prev.map(ch => 
      ch.id === editingId 
        ? { ...ch, ...editData } 
        : ch
    ));
    setEditingId(null);
    setEditData({});
  };

  const deleteChapter = (id: string) => {
    setChapters(prev => {
      const filtered = prev.filter(ch => ch.id !== id);
      // Renumber
      return filtered.map((ch, index) => ({ ...ch, number: index + 1 }));
    });
  };

  const addChapter = () => {
    const newChapter: ChapterOutlineItem = {
      id: crypto.randomUUID(),
      number: chapters.length + 1,
      title: `Új fejezet ${chapters.length + 1}`,
      description: "",
      keyPoints: [],
      estimatedWords: 3000,
    };
    setChapters(prev => [...prev, newChapter]);
    startEdit(newChapter);
  };

  const handleSave = async () => {
    const success = await onSave();
    if (success) {
      toast.success("Fejezetek mentve!");
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-[60vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Fejezet struktúra
        </h1>
        <p className="text-muted-foreground text-lg">
          Generáld, rendezd és szerkeszd a fejezeteket
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-4xl"
      >
        {/* Generate button */}
        {!hasOutline && !isGenerating && (
          <div className="flex justify-center mb-8">
            <Button
              size="lg"
              onClick={generateOutline}
              className="gap-2"
            >
              <Rocket className="w-5 h-5" />
              Outline Generálása
            </Button>
          </div>
        )}

        {/* Regenerate button */}
        {hasOutline && (
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={generateOutline}
              disabled={isGenerating}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
              Újragenerálás
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isGenerating && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chapters list */}
        {hasOutline && !isGenerating && (
          <Reorder.Group
            axis="y"
            values={chapters}
            onReorder={handleReorder}
            className="space-y-3"
          >
            <AnimatePresence>
              {chapters.map((chapter) => (
                <Reorder.Item
                  key={chapter.id}
                  value={chapter}
                  className={cn(
                    "p-4 rounded-xl border-2 bg-card transition-colors",
                    editingId === chapter.id 
                      ? "border-primary" 
                      : "border-border hover:border-primary/30"
                  )}
                >
                  {editingId === chapter.id ? (
                    // Edit mode
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          {chapter.number}.
                        </span>
                        <Input
                          value={editData.title || ""}
                          onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Fejezet címe"
                          className="flex-1"
                        />
                      </div>
                      <Textarea
                        value={editData.description || ""}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Fejezet leírása..."
                        className="min-h-[80px]"
                      />
                      <Input
                        value={editData.keyPoints?.join(", ") || ""}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          keyPoints: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                        }))}
                        placeholder="Kulcspontok (vesszővel elválasztva)"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          <X className="w-4 h-4 mr-1" />
                          Mégse
                        </Button>
                        <Button size="sm" onClick={saveEdit}>
                          <Check className="w-4 h-4 mr-1" />
                          Mentés
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-start gap-3">
                      <div className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <span className="text-lg font-bold text-muted-foreground w-8">
                        {chapter.number}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">{chapter.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {chapter.description}
                        </p>
                        {chapter.keyPoints.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {chapter.keyPoints.slice(0, 4).map((point, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded-full bg-muted"
                              >
                                {point}
                              </span>
                            ))}
                            {chapter.keyPoints.length > 4 && (
                              <span className="text-xs text-muted-foreground">
                                +{chapter.keyPoints.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          ~{chapter.estimatedWords.toLocaleString()} szó
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(chapter)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteChapter(chapter.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}

        {/* Add chapter button */}
        {hasOutline && !isGenerating && (
          <Button
            variant="outline"
            onClick={addChapter}
            className="w-full mt-4 gap-2 border-dashed"
          >
            <Plus className="w-4 h-4" />
            Új fejezet hozzáadása
          </Button>
        )}

        {/* Actions */}
        {hasOutline && !isGenerating && (
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {chapters.length} fejezet • ~{chapters.reduce((sum, ch) => sum + ch.estimatedWords, 0).toLocaleString()} szó
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Mentés..." : "Mentés"}
              </Button>
              <Button
                size="lg"
                onClick={onStartWriting}
                disabled={isDirty || !projectId}
                className="gap-2"
              >
                <Rocket className="w-5 h-5" />
                Könyv Írása Indítása
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
