import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Sparkles, 
  BookOpen, 
  Image, 
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Coins,
} from "lucide-react";
import { StorybookData, StorybookPage, AGE_GROUPS } from "@/types/storybook";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { 
  STORYBOOK_TEXT_COST, 
  STORYBOOK_ILLUSTRATION_COST 
} from "@/constants/credits";

interface StorybookGenerateStepProps {
  data: StorybookData;
  isGenerating: boolean;
  onGenerateStory: () => Promise<boolean>;
  onGenerateIllustrations: (onProgress?: (current: number, total: number) => void) => Promise<boolean>;
  onComplete: () => void;
  setPages: (pages: StorybookPage[]) => void;
}

type GenerationPhase = "idle" | "story" | "illustrations" | "complete" | "error";

export function StorybookGenerateStep({
  data,
  isGenerating,
  onGenerateStory,
  onGenerateIllustrations,
  onComplete,
  setPages,
}: StorybookGenerateStepProps) {
  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [currentIllustration, setCurrentIllustration] = useState(0);
  const [totalIllustrations, setTotalIllustrations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const hasStarted = useRef(false);
  
  const { subscription, usage, getRemainingWords } = useSubscription();

  const ageGroup = data.ageGroup ? AGE_GROUPS.find(g => g.id === data.ageGroup) : null;
  const totalPages = ageGroup?.pageCount || 12;
  const wordsPerPage = ageGroup?.wordCountPerPage || 30;

  // Calculate estimated costs
  const estimatedTextCost = STORYBOOK_TEXT_COST;
  const estimatedIllustrationCost = totalPages * STORYBOOK_ILLUSTRATION_COST;
  const estimatedTotalCost = estimatedTextCost + estimatedIllustrationCost;
  
  // Calculate available credits
  const totalAvailable = getRemainingWords();
  const hasEnoughCredits = totalAvailable >= estimatedTotalCost;

  const handleStartGeneration = async () => {
    // Check credits first
    if (!hasEnoughCredits) {
      toast.error("Nincs elég kredit a mesekönyv generálásához.");
      setError("Nincs elég kredit. Vásárolj krediteket vagy válassz kisebb korosztályt (kevesebb oldal).");
      setPhase("error");
      return;
    }

    setError(null);
    setPhase("story");
    setProgress(0);
    setCreditsUsed(0);

    try {
      // Story generation with progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 45));
      }, 300);

      const storySuccess = await onGenerateStory();
      clearInterval(progressInterval);

      if (!storySuccess) {
        throw new Error("Hiba a történet generálása során. Kérlek próbáld újra.");
      }

      setProgress(50);
      setCreditsUsed(STORYBOOK_TEXT_COST);
      setPhase("illustrations");

      // Generate illustrations with real progress tracking
      // Use the age group's fixed page count as initial estimate
      // The callback will update with actual values
      setTotalIllustrations(totalPages);
      setCurrentIllustration(0);

      const illustrationsSuccess = await onGenerateIllustrations((current, total) => {
        setCurrentIllustration(current);
        if (total > 0) {
          setTotalIllustrations(total);
        }
        const illustrationProgress = 50 + (current / (total || totalPages)) * 45;
        setProgress(illustrationProgress);
        setCreditsUsed(STORYBOOK_TEXT_COST + (current * STORYBOOK_ILLUSTRATION_COST));
      });
      
      if (!illustrationsSuccess) {
        // Check if it failed because of no pages
        const actualPagesCount = data.pages.length;
        if (actualPagesCount === 0) {
          throw new Error("Nem sikerült az oldalakat generálni. Kérlek próbáld újra.");
        }
        throw new Error("Néhány illusztráció nem készült el. Az előnézetben újragenerálhatod őket.");
      }

      const finalPagesCount = data.pages.length || totalPages;
      setProgress(100);
      setCreditsUsed(STORYBOOK_TEXT_COST + (finalPagesCount * STORYBOOK_ILLUSTRATION_COST));
      setPhase("complete");
      toast.success("A mesekönyv elkészült!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ismeretlen hiba történt";
      setError(errorMessage);
      setPhase("error");
      toast.error(errorMessage);
    }
  };

  const handleRetry = () => {
    hasStarted.current = false;
    setPhase("idle");
    setProgress(0);
    setCurrentIllustration(0);
    setError(null);
    setCreditsUsed(0);
  };

  const handleContinueWithErrors = () => {
    // Check if at least some pages have illustrations
    const successfulPages = data.pages.filter(p => p.illustrationUrl);
    
    if (successfulPages.length > 0) {
      setPhase("complete");
    } else {
      toast.error("Legalább egy illusztrációnak el kell készülnie a folytatáshoz.");
    }
  };

  const formatCredits = (credits: number) => {
    return credits.toLocaleString("hu-HU");
  };

  const renderPhaseContent = () => {
    switch (phase) {
      case "idle":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">
              Készen állsz a varázslatra?
            </h2>
            <p className="text-muted-foreground mb-6">
              Az AI most elkészíti a személyre szabott mesekönyvedet
            </p>

            {/* Credit estimation panel */}
            <div className="max-w-md mx-auto mb-8 p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold">Becsült költség</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Szöveg generálás:</span>
                  <span>{formatCredits(estimatedTextCost)} kredit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Illusztrációk ({totalPages} db × {STORYBOOK_ILLUSTRATION_COST}):</span>
                  <span>{formatCredits(estimatedIllustrationCost)} kredit</span>
                </div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Összesen:</span>
                  <span className={hasEnoughCredits ? "text-primary" : "text-destructive"}>
                    ~{formatCredits(estimatedTotalCost)} kredit
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Elérhető kredit:</span>
                  <span className={hasEnoughCredits ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                    {formatCredits(totalAvailable)}
                  </span>
                </div>
              </div>

              {!hasEnoughCredits && (
                <div className="mt-3 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                  Nincs elég kredit. Vásárolj krediteket a folytatáshoz.
                </div>
              )}
            </div>

            <Button 
              onClick={handleStartGeneration} 
              size="lg" 
              className="gap-2"
              disabled={!hasEnoughCredits}
            >
              <Sparkles className="w-4 h-4" />
              Generálás indítása
            </Button>
          </motion.div>
        );

      case "error":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-destructive">
              Hiba történt
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
            
            {creditsUsed > 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                Eddig felhasznált kredit: {formatCredits(creditsUsed)}
              </p>
            )}
            
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleContinueWithErrors}>
                Folytatás az előnézethez
              </Button>
              <Button onClick={handleRetry} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Újrapróbálás
              </Button>
            </div>
          </motion.div>
        );

      case "story":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              A történet készül...
            </h2>
            <p className="text-muted-foreground mb-6">
              Az AI most írja meg a személyre szabott mesét
            </p>
            
            <div className="max-w-md mx-auto space-y-2">
              <Progress value={progress} className="h-3" />
              <p className="text-sm text-muted-foreground">
                Történet generálása... {Math.round(progress)}%
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 p-4 rounded-lg bg-primary/5 max-w-md mx-auto"
            >
              <p className="text-sm italic text-muted-foreground">
                "Egyszer volt, hol nem volt..."
              </p>
            </motion.div>
          </motion.div>
        );

      case "illustrations":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-amber-400/20 border-t-amber-400"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Image className="w-10 h-10 text-amber-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Illusztrációk készülnek...
            </h2>
            <p className="text-muted-foreground mb-6">
              Az AI most rajzolja meg a mesekönyv képeit
            </p>
            
            <div className="max-w-md mx-auto space-y-2">
              <Progress value={progress} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {currentIllustration}. kép / {totalIllustrations || data.pages.length || totalPages} oldal... {Math.round(progress)}%
              </p>
            </div>

            {/* Illustration preview grid */}
            <div className="mt-8 grid grid-cols-4 gap-2 max-w-md mx-auto">
              {Array.from({ length: totalIllustrations || data.pages.length || totalPages }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: i < currentIllustration ? 1 : 0.3,
                    scale: i < currentIllustration ? 1 : 0.9,
                  }}
                  className={`aspect-square rounded-lg ${
                    i < currentIllustration 
                      ? "bg-gradient-to-br from-amber-400 to-orange-500" 
                      : "bg-muted"
                  } flex items-center justify-center`}
                >
                  {i < currentIllustration && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Credit usage */}
            <div className="mt-6 text-sm text-muted-foreground">
              Felhasznált kredit: {formatCredits(creditsUsed)}
            </div>
          </motion.div>
        );

      case "complete":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center"
            >
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-3xl font-bold mb-2">
                🎉 A mesekönyv elkészült!
              </h2>
              <p className="text-muted-foreground mb-8">
                "{data.title}" készen áll az olvasásra
              </p>
            </motion.div>

            {/* Quick stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center gap-8 mb-8"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{data.pages.length || totalPages}</div>
                <div className="text-sm text-muted-foreground">oldal</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {data.pages.filter(p => p.illustrationUrl).length || totalPages}
                </div>
                <div className="text-sm text-muted-foreground">illusztráció</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{data.characters.length}</div>
                <div className="text-sm text-muted-foreground">szereplő</div>
              </div>
            </motion.div>

            {/* Credits used */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mb-8 text-sm text-muted-foreground"
            >
              Felhasznált kredit: <span className="font-semibold text-foreground">{formatCredits(creditsUsed)}</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button onClick={onComplete} size="lg" className="gap-2">
                Mesekönyv megtekintése
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      <AnimatePresence mode="wait">
        <motion.div key={phase}>
          {renderPhaseContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default StorybookGenerateStep;
