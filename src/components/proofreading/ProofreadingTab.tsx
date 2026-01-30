import { AlertTriangle, BookCheck, CheckCircle2, FlaskConical, Loader2, Sparkles, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useProofreading } from "@/hooks/useProofreading";
import { useAdmin } from "@/hooks/useAdmin";
import { useSubscription } from "@/hooks/useSubscription";
import { AIModelBadge } from "@/components/ui/ai-model-badge";
import { BuyCreditModal } from "@/components/credits/BuyCreditModal";
import { useState } from "react";

interface ProofreadingTabProps {
  projectId: string;
}

const FEATURES = [
  "Helyesírás és nyelvtan ellenőrzés",
  "Stilisztikai javítások",
  "Ismétlődések eltávolítása",
  "Mondatritmus javítása",
  "Nyomdakész szöveg",
];

export function ProofreadingTab({ projectId }: ProofreadingTabProps) {
  const { isAdmin } = useAdmin();
  const { getRemainingWords, isLoading: subscriptionLoading } = useSubscription();
  const [showBuyCreditModal, setShowBuyCreditModal] = useState(false);
  
  const {
    order,
    orderLoading,
    wordCount,
    wordCountLoading,
    chapterCount,
    creditsNeeded,
    progress,
    isProcessing,
    isCompleted,
    isFailed,
    canStart,
    startProofreading,
    isStarting,
    testProofreading,
    isTesting,
  } = useProofreading(projectId);

  const availableCredits = getRemainingWords();
  const hasEnoughCredits = availableCredits >= creditsNeeded;

  if (orderLoading || wordCountLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Warning about raw content */}
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">Figyelem</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            A szoftver által generált szöveg <strong>nyersanyag</strong>. Kiadás előtt javasoljuk 
            a professzionális lektorálást – akár emberi lektorral, akár az AI Lektor szolgáltatással.
          </AlertDescription>
        </Alert>

        {/* Processing Status Card */}
        {isProcessing && order && (
          <Card className="border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <CardTitle>Lektorálás folyamatban...</CardTitle>
              </div>
              <CardDescription>
                {order.current_chapter_index} / {order.total_chapters} fejezet feldolgozva
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                Kérlek, ne zárd be az oldalt. A lektorálás a háttérben fut, de az előrehaladást 
                itt követheted.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Completed Status Card */}
        {isCompleted && order && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <CardTitle className="text-green-600 dark:text-green-400">
                  Lektorálás befejezve!
                </CardTitle>
              </div>
              <CardDescription>
                {order.total_chapters} fejezet sikeresen lektorálva • {" "}
                {new Date(order.completed_at!).toLocaleDateString("hu-HU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                A könyved szövege frissült a lektorált verzióra. A Szerkesztő fülön már a javított 
                szöveget láthatod.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Failed Status Card */}
        {isFailed && order && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Hiba történt</CardTitle>
              </div>
              <CardDescription>
                {order.current_chapter_index} / {order.total_chapters} fejezet feldolgozva
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {order.error_message || "Ismeretlen hiba történt a lektorálás során."}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                A már feldolgozott fejezetek szövege frissült. Újra megpróbálhatod a lektorálást 
                a fennmaradó fejezetekre.
              </p>
            </CardContent>
          </Card>
        )}

        {/* AI Proofreading Service Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>AI Lektor Szolgáltatás</CardTitle>
              </div>
              <AIModelBadge 
                modelId="anthropic/claude-sonnet-4.5" 
                variant="default"
              />
            </div>
            <CardDescription className="mt-2">
              A <strong>Claude Sonnet 4.5</strong> a legfejlettebb AI modell a magyar nyelvtan, 
              helyesírás és stilisztika terén. Professzionális minőségű lektorálást biztosít.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{wordCount.toLocaleString("hu-HU")}</p>
                <p className="text-sm text-muted-foreground">szó</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{chapterCount}</p>
                <p className="text-sm text-muted-foreground">fejezet</p>
              </div>
            </div>

            {/* Credit Cost */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Szükséges szó kredit</p>
              <p className="text-3xl font-bold text-primary">
                {creditsNeeded.toLocaleString("hu-HU")}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`text-sm ${hasEnoughCredits ? "text-green-600" : "text-destructive"}`}>
                  {hasEnoughCredits ? "✓" : "✗"} Elérhető: {availableCredits.toLocaleString("hu-HU")}
                </span>
              </div>
            </div>

            {/* No credits warning */}
            {!hasEnoughCredits && !subscriptionLoading && (
              <Alert variant="destructive" className="bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Nincs elég kredit!</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>Vásárolj extra krediteket a lektoráláshoz.</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowBuyCreditModal(true)}
                  >
                    Kredit vásárlás
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Features */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <BookCheck className="h-4 w-4" />
                Mit tartalmaz?
              </h4>
              <ul className="space-y-2">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Warning about destructive action */}
            <Alert variant="destructive" className="bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Fontos!</AlertTitle>
              <AlertDescription>
                A lektorálás <strong>felülírja az eredeti szöveget</strong>. A folyamat nem vonható 
                vissza. Javasoljuk, hogy előtte exportáld a könyvet biztonsági mentésként.
              </AlertDescription>
            </Alert>

            {/* Start Button */}
            {canStart ? (
              <Button
                size="lg"
                className="w-full"
                onClick={() => startProofreading()}
                disabled={isStarting || wordCount < 100 || !hasEnoughCredits}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Indítás...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Lektorálás Indítása – {creditsNeeded.toLocaleString("hu-HU")} kredit
                  </>
                )}
              </Button>
            ) : (
              <Button size="lg" className="w-full" disabled>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Lektorálás folyamatban...
              </Button>
            )}

            {wordCount < 100 && (
              <p className="text-sm text-muted-foreground text-center">
                A lektoráláshoz legalább 100 szó szükséges.
              </p>
            )}

            {/* Admin Test Button */}
            {isAdmin && canStart && wordCount >= 100 && (
              <>
                <Separator />
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  onClick={() => testProofreading()}
                  disabled={isTesting || isProcessing}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Indítás...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-4 w-4 mr-2" />
                      🧪 TESZT Lektorálás (Admin - Ingyenes)
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Ez a gomb csak adminoknak látható. A teszt lektorálás ingyenes.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <BuyCreditModal 
        open={showBuyCreditModal} 
        onOpenChange={setShowBuyCreditModal} 
      />
    </div>
  );
}
