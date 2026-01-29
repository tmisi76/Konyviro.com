import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  BookOpen,
  Clock,
  FileText,
  RefreshCw
} from "lucide-react";
import { useBackgroundWriter, WritingStatus } from "@/hooks/useBackgroundWriter";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { ReactNode } from "react";

interface WritingStatusCardProps {
  projectId: string;
  projectTitle: string;
}

const statusConfig: Record<WritingStatus, { label: string; color: string; icon: ReactNode }> = {
  idle: { label: "Nem indult", color: "bg-muted", icon: <Clock className="h-3 w-3" /> },
  draft: { label: "Vázlat", color: "bg-slate-500", icon: <FileText className="h-3 w-3" /> },
  queued: { label: "Sorban áll", color: "bg-yellow-500", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  generating_outlines: { label: "Vázlatok készítése", color: "bg-blue-500", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  writing: { label: "Írás folyamatban", color: "bg-green-500", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  in_progress: { label: "Írás folyamatban", color: "bg-green-500", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  paused: { label: "Szüneteltetve", color: "bg-orange-500", icon: <Pause className="h-3 w-3" /> },
  completed: { label: "Elkészült", color: "bg-emerald-500", icon: <CheckCircle className="h-3 w-3" /> },
  incomplete: { label: "Nem teljes", color: "bg-amber-500", icon: <AlertCircle className="h-3 w-3" /> },
  failed: { label: "Hiba történt", color: "bg-destructive", icon: <AlertCircle className="h-3 w-3" /> },
};

export function WritingStatusCard({ projectId, projectTitle }: WritingStatusCardProps) {
  const {
    progress,
    progressPercent,
    wordProgressPercent,
    isLoading,
    canStart,
    canPause,
    canResume,
    canRecover,
    startWriting,
    resumeWriting,
    pauseWriting,
    recoverMissingScenes,
  } = useBackgroundWriter(projectId);

  const status = statusConfig[progress.status] || statusConfig.idle;

  // Ne rejtsd el - mindig mutasd a kártyát, hogy lehessen indítani
  // A Dashboard szintjén kell szűrni, hogy milyen projektek jelenjenek meg

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            {projectTitle}
          </CardTitle>
          <Badge variant="secondary" className={`${status.color} text-white`}>
            <span className="flex items-center gap-1">
              {status.icon}
              {status.label}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar - szekciók */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Szekciók</span>
            <span className="font-medium">
              {progress.completedScenes} / {progress.totalScenes} ({progressPercent}%)
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Progress bar - szavak */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Szavak</span>
            <span className="font-medium">
              {progress.wordCount.toLocaleString("hu-HU")} / {progress.targetWordCount.toLocaleString("hu-HU")} ({Math.min(wordProgressPercent, 100)}%)
            </span>
          </div>
          <Progress 
            value={Math.min(wordProgressPercent, 100)} 
            className={`h-2 ${progress.status === 'completed' ? '[&>div]:bg-emerald-500' : ''}`} 
          />
        </div>

        {/* Hibás szekciók */}
        {progress.failedScenes > 0 && (
          <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {progress.failedScenes} szekció nem sikerült
          </div>
        )}

        {/* Hiba üzenet */}
        {progress.error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
            {progress.error}
          </div>
        )}

        {/* Időbélyegek */}
        <div className="text-xs text-muted-foreground space-y-1">
          {progress.startedAt && (
            <p>
              Elindítva: {formatDistanceToNow(new Date(progress.startedAt), { addSuffix: true, locale: hu })}
            </p>
          )}
          {progress.completedAt && (
            <p>
              Befejezve: {formatDistanceToNow(new Date(progress.completedAt), { addSuffix: true, locale: hu })}
            </p>
          )}
        </div>

        {/* Akció gombok */}
        <div className="flex gap-2 flex-wrap">
          {canStart && (
            <Button 
              size="sm" 
              onClick={startWriting} 
              disabled={isLoading}
              variant={progress.status === 'failed' ? 'destructive' : 'default'}
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : 
                progress.status === 'failed' ? <RotateCcw className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {progress.status === 'failed' ? 'Újraindítás' : 'Indítás'}
            </Button>
          )}
          
          {canPause && (
            <Button size="sm" variant="outline" onClick={pauseWriting} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Pause className="h-4 w-4 mr-1" />}
              Szünet
            </Button>
          )}
          
          {canResume && (
            <Button size="sm" onClick={resumeWriting} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Folytatás
            </Button>
          )}

          {canRecover && (
            <Button size="sm" variant="secondary" onClick={recoverMissingScenes} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Hiányzó jelenetek pótlása
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
