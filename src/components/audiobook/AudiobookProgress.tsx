import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Audiobook, AudiobookChapter } from "@/types/audiobook";

interface AudiobookProgressProps {
  audiobook: Audiobook;
  chapters?: AudiobookChapter[];
}

export function AudiobookProgress({ audiobook, chapters }: AudiobookProgressProps) {
  const progress = audiobook.total_chapters > 0
    ? Math.round((audiobook.completed_chapters / audiobook.total_chapters) * 100)
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Várakozik</Badge>;
      case "processing":
        return <Badge variant="default" className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Folyamatban</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Kész</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Hiba</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Hangoskönyv generálás</CardTitle>
          {getStatusBadge(audiobook.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {audiobook.completed_chapters} / {audiobook.total_chapters} fejezet
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Error message */}
        {audiobook.error_message && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {audiobook.error_message}
          </div>
        )}

        {/* Chapter list */}
        {chapters && chapters.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
              >
                <span className="text-sm truncate flex-1">
                  {chapter.chapter?.title || `${chapter.sort_order + 1}. fejezet`}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {chapter.duration_seconds && (
                    <span className="text-xs text-muted-foreground">
                      {Math.floor(chapter.duration_seconds / 60)}:{String(chapter.duration_seconds % 60).padStart(2, "0")}
                    </span>
                  )}
                  {chapter.status === "processing" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {chapter.status === "completed" && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {chapter.status === "failed" && (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  {chapter.status === "pending" && (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Estimated time */}
        {audiobook.status === "processing" && (
          <p className="text-xs text-muted-foreground text-center">
            Becsült idő: ~{Math.ceil((audiobook.total_chapters - audiobook.completed_chapters) * 2)} perc
          </p>
        )}
      </CardContent>
    </Card>
  );
}
