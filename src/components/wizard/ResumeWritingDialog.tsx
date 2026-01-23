import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Play, RotateCcw } from "lucide-react";

interface ResumeWritingDialogProps {
  open: boolean;
  savedProgress: {
    completedScenes: number;
    totalScenes: number;
    totalWords: number;
  };
  onResume: () => void;
  onRestart: () => void;
}

export function ResumeWritingDialog({
  open,
  savedProgress,
  onResume,
  onRestart,
}: ResumeWritingDialogProps) {
  const progressPercent = savedProgress.totalScenes > 0 
    ? Math.round((savedProgress.completedScenes / savedProgress.totalScenes) * 100) 
    : 0;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Folytatod az írást?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Van egy mentett folyamat, amelyet korábban megszakítottál.
            </p>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Haladás:</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Jelenetek:</span>
                <span className="font-medium">{savedProgress.completedScenes}/{savedProgress.totalScenes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Megírt szavak:</span>
                <span className="font-medium">{savedProgress.totalWords.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-sm">
              Szeretnéd folytatni ahol abbahagytad, vagy újrakezdeni az elejéről?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onRestart} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Újrakezdés
          </AlertDialogCancel>
          <AlertDialogAction onClick={onResume} className="gap-2">
            <Play className="w-4 h-4" />
            Folytatás
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
