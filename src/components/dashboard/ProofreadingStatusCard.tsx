import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookCheck, Loader2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface ProofreadingStatusCardProps {
  orderId: string;
  projectId: string;
  projectTitle: string;
  status: "paid" | "processing";
  currentChapter: number;
  totalChapters: number;
  startedAt: string | null;
}

export function ProofreadingStatusCard({
  orderId,
  projectId,
  projectTitle,
  status,
  currentChapter,
  totalChapters,
  startedAt,
}: ProofreadingStatusCardProps) {
  const navigate = useNavigate();
  
  const progressPercent = totalChapters > 0 
    ? Math.round((currentChapter / totalChapters) * 100) 
    : 0;

  const statusLabel = status === "paid" ? "Indulásra vár" : "Lektorálás folyamatban";
  const statusColor = status === "paid" ? "bg-yellow-500" : "bg-blue-500";

  const handleOpenEditor = () => {
    navigate(`/project/${projectId}?tab=proofreading`);
  };

  return (
    <Card className="border-blue-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BookCheck className="h-4 w-4 text-blue-500" />
            {projectTitle}
          </CardTitle>
          <Badge variant="secondary" className={`${statusColor} text-white`}>
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {statusLabel}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fejezetek</span>
            <span className="font-medium">
              {currentChapter} / {totalChapters} ({progressPercent}%)
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Időbélyeg */}
        {startedAt && (
          <div className="text-xs text-muted-foreground">
            Elindítva: {formatDistanceToNow(new Date(startedAt), { addSuffix: true, locale: hu })}
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          A lektorálás a háttérben fut. Bármikor bezárhatod az oldalt.
        </p>

        {/* Open editor button */}
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleOpenEditor}
          className="w-full"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Szerkesztő megnyitása
        </Button>
      </CardContent>
    </Card>
  );
}
