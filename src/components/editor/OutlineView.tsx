import { useState } from "react";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Chapter, ChapterStatus, ProjectGenre, ChapterTemplate } from "@/types/editor";
import { STATUS_LABELS, STATUS_COLORS, CHAPTER_TEMPLATES } from "@/types/editor";

interface OutlineViewProps {
  chapters: Chapter[];
  projectGenre: ProjectGenre | undefined;
  projectDescription: string | undefined;
  onUpdateChapter: (id: string, updates: Partial<Chapter>) => void;
  onSelectChapter: (id: string) => void;
  onCreateChapter: (title?: string) => void;
  onGenerateOutline: (description: string) => Promise<void>;
  isGenerating: boolean;
}

export function OutlineView({
  chapters,
  projectGenre,
  projectDescription,
  onUpdateChapter,
  onSelectChapter,
  onCreateChapter,
  onGenerateOutline,
  isGenerating,
}: OutlineViewProps) {
  const [editingKeyPoints, setEditingKeyPoints] = useState<string | null>(null);
  const [keyPointsInput, setKeyPointsInput] = useState("");

  const templates = projectGenre ? CHAPTER_TEMPLATES[projectGenre] || [] : [];

  const handleSaveKeyPoints = (chapterId: string) => {
    const points = keyPointsInput
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    onUpdateChapter(chapterId, { key_points: points });
    setEditingKeyPoints(null);
  };

  const handleStartEditKeyPoints = (chapter: Chapter) => {
    setEditingKeyPoints(chapter.id);
    setKeyPointsInput((chapter.key_points || []).join("\n"));
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k szó`;
    }
    return `${count} szó`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header with AI generate button */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Könyv vázlat</h2>
          <Button
            onClick={() => onGenerateOutline(projectDescription || "")}
            disabled={isGenerating || !projectDescription}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            AI vázlat generálás
          </Button>
        </div>

        {/* Templates section */}
        {templates.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              Fejezet sablonok ({projectGenre === "szakkonyv" ? "Szakkönyv" : projectGenre === "fiction" ? "Fiction" : "Erotikus"})
            </h3>
            <div className="flex flex-wrap gap-2">
              {templates.map((template: ChapterTemplate) => (
                <Button
                  key={template.title}
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateChapter(template.title)}
                  className="gap-2"
                  title={template.description}
                >
                  <Plus className="h-3 w-3" />
                  {template.title}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Chapter grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter, index) => (
            <Card
              key={chapter.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => onSelectChapter(chapter.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        STATUS_COLORS[chapter.status as ChapterStatus]
                      )}
                    />
                    <span className="text-sm text-muted-foreground">{index + 1}.</span>
                  </div>
                  <Select
                    value={chapter.status}
                    onValueChange={(value) =>
                      onUpdateChapter(chapter.id, { status: value as ChapterStatus })
                    }
                  >
                    <SelectTrigger
                      className="h-7 w-auto gap-1 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <CardTitle className="text-base">{chapter.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Summary */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Textarea
                    placeholder="Egysoros összefoglaló..."
                    value={chapter.summary || ""}
                    onChange={(e) => onUpdateChapter(chapter.id, { summary: e.target.value })}
                    className="h-16 resize-none text-sm"
                  />
                </div>

                {/* Key points */}
                <div onClick={(e) => e.stopPropagation()}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Kulcspontok</p>
                  {editingKeyPoints === chapter.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={keyPointsInput}
                        onChange={(e) => setKeyPointsInput(e.target.value)}
                        placeholder="Egy pont soronként..."
                        className="h-20 resize-none text-xs"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingKeyPoints(null)}
                        >
                          Mégse
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveKeyPoints(chapter.id)}
                        >
                          Mentés
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="min-h-[40px] cursor-text rounded border border-dashed border-border p-2 text-xs hover:bg-muted/50"
                      onClick={() => handleStartEditKeyPoints(chapter)}
                    >
                      {chapter.key_points && chapter.key_points.length > 0 ? (
                        <ul className="list-inside list-disc space-y-0.5">
                          {chapter.key_points.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">
                          Kattints a szerkesztéshez...
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Word count */}
                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span>Szavak:</span>
                  <span className="font-medium">
                    {formatWordCount(chapter.word_count)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add chapter card */}
          <Card
            className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-muted/50"
            onClick={() => onCreateChapter()}
          >
            <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Plus className="h-8 w-8" />
              <span className="text-sm">Új fejezet</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
