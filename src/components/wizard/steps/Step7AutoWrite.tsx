import { useNavigate } from "react-router-dom";
import { useBackgroundWriter } from "@/hooks/useBackgroundWriter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Loader2, 
  BookOpen, 
  CheckCircle, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import type { Genre } from "@/types/wizard";

interface Step7AutoWriteProps {
  projectId: string;
  genre: Genre;
  estimatedMinutes?: number;
  checkpointMode?: boolean;
  onComplete: () => void;
}

/**
 * Step7AutoWrite - Automatikus könyvírás indító lépés
 * 
 * Ez a komponens a háttérben futó könyvírást indítja el.
 * A folyamat a szerveren fut, így bezárható a böngésző.
 * A progress a Dashboard-on követhető a WritingStatusCard-on keresztül.
 * 
 * @deprecated useAutoWrite - A régi böngésző-alapú loop lecserélve useBackgroundWriter-re
 */
export function Step7AutoWrite({ projectId, genre, onComplete }: Step7AutoWriteProps) {
  const navigate = useNavigate();
  const { 
    progress, 
    progressPercent,
    wordProgressPercent,
    isLoading, 
    canStart,
    isWriting,
    startWriting 
  } = useBackgroundWriter(projectId);

  const isNonFiction = genre === "szakkonyv";

  const handleStartWriting = async () => {
    try {
      await startWriting();
      // Kis várakozás, hogy a real-time subscription is frissülhessen
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate("/dashboard");
    } catch (error) {
      // Ha hiba van, ne navigáljunk el - a toast már megjelenik a hook-ból
      console.error("Writing start failed:", error);
    }
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  // Ha már fut az írás, mutassuk a progress-t és a dashboard linket
  if (isWriting || progress.status === 'paused' || progress.status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              {progress.status === 'completed' ? (
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              ) : (
                <BookOpen className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {progress.status === 'completed' 
                ? 'A könyved elkészült!' 
                : 'Könyvírás folyamatban'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status badge */}
            <div className="flex justify-center">
              <Badge 
                variant="secondary" 
                className={`${
                  progress.status === 'completed' 
                    ? 'bg-emerald-500' 
                    : progress.status === 'paused' 
                    ? 'bg-orange-500' 
                    : 'bg-primary'
                } text-white`}
              >
                {progress.status === 'completed' && 'Elkészült'}
                {progress.status === 'paused' && 'Szüneteltetve'}
                {progress.status === 'writing' && 'Írás folyamatban'}
                {progress.status === 'generating_outlines' && 'Vázlatok készítése'}
                {progress.status === 'queued' && 'Sorban áll'}
              </Badge>
            </div>

            {/* Progress info */}
            {progress.totalScenes > 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {isNonFiction ? "Szekciók" : "Jelenetek"}
                    </span>
                    <span className="font-medium">
                      {progress.completedScenes} / {progress.totalScenes} ({progressPercent}%)
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Szavak</span>
                    <span className="font-medium">
                      {progress.wordCount.toLocaleString("hu-HU")} / {progress.targetWordCount.toLocaleString("hu-HU")}
                    </span>
                  </div>
                  <Progress value={wordProgressPercent} className="h-2" />
                </div>
              </div>
            )}

            {/* Error message */}
            {progress.error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {progress.error}
              </div>
            )}

            {/* Info message */}
            {progress.status !== 'completed' && (
              <p className="text-center text-muted-foreground">
                A könyved írása a háttérben fut. Bezárhatod ezt az oldalt, 
                a folyamatot a Dashboard-on követheted nyomon.
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Button onClick={handleGoToDashboard} className="w-full" size="lg">
                <ArrowRight className="mr-2 h-5 w-5" />
                {progress.status === 'completed' 
                  ? 'Vissza a Dashboard-ra' 
                  : 'Folyamat követése a Dashboard-on'}
              </Button>
              
              {progress.status === 'completed' && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/project/${projectId}`)} 
                  className="w-full"
                >
                  Megnyitás a Szerkesztőben
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Idle állapot - indítási képernyő
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Készen állsz az automatikus írásra?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Az AI megírja a könyvedet a háttérben. Bezárhatod a böngészőt, 
            az írás folytatódik. A folyamatot a Dashboard-on követheted nyomon.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Hogyan működik?
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
              <li>Az AI elkészíti a fejezetek részletes vázlatát</li>
              <li>Majd megírja az összes {isNonFiction ? "szekciót" : "jelenetet"}</li>
              <li>A folyamat a háttérben fut - bezárhatod az oldalt</li>
              <li>Értesítünk, ha elkészült a könyved</li>
            </ul>
          </div>

          <Button 
            size="lg" 
            className="w-full" 
            onClick={handleStartWriting}
            disabled={isLoading || !canStart}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Indítás...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Automatikus írás indítása
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            A gomb megnyomása után átirányítunk a Dashboard-ra, 
            ahol valós időben követheted a könyved készülését.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}