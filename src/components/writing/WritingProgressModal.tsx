import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Pause, 
  Play,
  BookOpen, 
  Sparkles,
  Clock,
  Timer,
  CheckCircle2,
  FileEdit,
  AlertCircle,
  RefreshCw,
  Coins
} from "lucide-react";

interface WritingProgressModalProps {
  open: boolean;
  status: "idle" | "generating_outline" | "writing" | "paused" | "error" | "completed";
  currentChapter: string;
  currentScene: string;
  completedScenes: number;
  totalScenes: number;
  streamingText: string;
  totalWords: number;
  isNonFiction?: boolean;
  initialEstimatedMinutes?: number;
  failedScenes?: number;
  skippedScenes?: number;
  avgSecondsPerScene?: number;
  error?: string;
  // Kredit adatok
  remainingWords?: number;
  usedWordsThisSession?: number;
  extraWordsBalance?: number;
  monthlyWordLimit?: number;
  monthlyWordsUsed?: number;
  // Callbacks
  onPause: () => void;
  onResume?: () => void;
  onRestartFailed?: () => void;
  onOpenEditor?: () => void;
}

// Rotáló státusz üzenetek
const WRITING_MESSAGES = [
  "Jelenet írása folyamatban...",
  "Karakter párbeszédek kidolgozása...",
  "Hangulat és atmoszféra építése...",
  "Részletek finomítása...",
  "Történet szövése...",
  "Érzelmek megjelenítése...",
  "Cselekmény bontakoztatása...",
  "Leírások gazdagítása...",
];

const NONFICTION_MESSAGES = [
  "Szekció írása folyamatban...",
  "Fogalmak kifejtése...",
  "Példák kidolgozása...",
  "Struktúra építése...",
  "Tanulságok megfogalmazása...",
  "Gyakorlatok készítése...",
  "Összefoglalás írása...",
];

const OUTLINE_MESSAGES = [
  "Fejezet vázlat készítése...",
  "Cselekmény struktúra tervezése...",
  "Jelenetek felosztása...",
  "Történet elemzése...",
];

// Formázás (mm:ss)
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function WritingProgressModal({
  open,
  status,
  currentChapter,
  currentScene,
  completedScenes,
  totalScenes,
  streamingText,
  totalWords,
  isNonFiction = false,
  initialEstimatedMinutes,
  failedScenes = 0,
  skippedScenes = 0,
  avgSecondsPerScene,
  error,
  remainingWords = 0,
  usedWordsThisSession = 0,
  extraWordsBalance = 0,
  monthlyWordLimit = 0,
  monthlyWordsUsed = 0,
  onPause,
  onResume,
  onRestartFailed,
  onOpenEditor,
}: WritingProgressModalProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Wizard-ból kapott becsült idő másodpercben
  const initialTotalSeconds = initialEstimatedMinutes ? initialEstimatedMinutes * 60 : null;

  // Válaszd ki a megfelelő üzenet listát
  const messages = status === "generating_outline" 
    ? OUTLINE_MESSAGES 
    : isNonFiction 
      ? NONFICTION_MESSAGES 
      : WRITING_MESSAGES;

  // Rotáló üzenet minden 4 másodpercben
  useEffect(() => {
    if (!open || status === "paused" || status === "completed" || status === "error") return;
    
    const interval = setInterval(() => {
      setMessageIndex(i => (i + 1) % messages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [open, status, messages.length]);

  // Írás indításakor beállítjuk a kezdési időt
  useEffect(() => {
    if ((status === "writing" || status === "generating_outline") && startTime === null) {
      setStartTime(Date.now());
    }
  }, [status, startTime]);

  // Eltelt idő frissítése másodpercenként
  useEffect(() => {
    if (!startTime) return;
    if (status !== "writing" && status !== "generating_outline") return;
    
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, status]);

  const progressPercent = totalScenes > 0 
    ? Math.round((completedScenes / totalScenes) * 100) 
    : 0;

  const sceneLabel = isNonFiction ? "szekció" : "jelenet";

  // Becsült hátralevő idő kalkuláció
  const estimatedRemainingSeconds = (() => {
    if (completedScenes === 0 && initialTotalSeconds) {
      return initialTotalSeconds;
    }
    
    if (avgSecondsPerScene && avgSecondsPerScene > 0) {
      const remainingScenes = totalScenes - completedScenes - failedScenes - skippedScenes;
      return Math.round(remainingScenes * avgSecondsPerScene);
    }
    
    const avgSecs = completedScenes > 0 
      ? elapsedSeconds / completedScenes 
      : (initialTotalSeconds && totalScenes > 0 ? initialTotalSeconds / totalScenes : 45);
    
    const remainingScenes = totalScenes - completedScenes - failedScenes - skippedScenes;
    return Math.round(remainingScenes * avgSecs);
  })();

  // Kredit használat százalék
  const creditUsagePercent = monthlyWordLimit > 0 
    ? Math.min((monthlyWordsUsed / monthlyWordLimit) * 100, 100)
    : 0;

  // Csak idle státuszban tűnik el - minden más esetben látható
  if (status === "idle") {
    return null;
  }

  const isCompleted = status === "completed";
  const isPaused = status === "paused";
  const isError = status === "error";
  const isWriting = status === "writing" || status === "generating_outline";

  return (
    <Dialog open={open}>
      <DialogContent 
        className="max-w-lg sm:max-w-xl p-0 overflow-hidden border-primary/20 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {isCompleted ? (
          /* Befejező képernyő */
          <div className="text-center py-10 px-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-2xl font-bold mb-3">🎉 A könyved elkészült!</h3>
              <p className="text-lg text-muted-foreground mb-2">
                {totalWords.toLocaleString()} szó • {completedScenes} {sceneLabel}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Írás időtartama: {formatTime(elapsedSeconds)}
              </p>
              
              {/* Session kredit összesítés */}
              <div className="bg-muted/40 rounded-lg p-3 mb-6 mx-auto max-w-xs">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Coins className="w-4 h-4" />
                    Felhasznált kredit
                  </span>
                  <span className="font-medium text-primary">
                    {usedWordsThisSession.toLocaleString()} szó
                  </span>
                </div>
              </div>
              
              {onOpenEditor && (
                <Button onClick={onOpenEditor} size="lg" className="gap-2">
                  <FileEdit className="w-5 h-5" />
                  Megnyitás a szerkesztőben
                </Button>
              )}
            </motion.div>
          </div>
        ) : isPaused ? (
          /* Szüneteltetve képernyő */
          <div className="text-center py-10 px-6">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6"
            >
              <Pause className="w-10 h-10 text-amber-500" />
            </motion.div>
            
            <h3 className="text-xl font-bold mb-2">Írás szüneteltetve</h3>
            <p className="text-muted-foreground mb-2">
              {completedScenes} / {totalScenes} {sceneLabel} elkészült
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {totalWords.toLocaleString()} szó • Eltelt: {formatTime(elapsedSeconds)}
            </p>
            
            {/* Kredit panel szüneteltetéskor */}
            <CreditPanel 
              usedWordsThisSession={usedWordsThisSession}
              monthlyWordsUsed={monthlyWordsUsed}
              monthlyWordLimit={monthlyWordLimit}
              extraWordsBalance={extraWordsBalance}
              creditUsagePercent={creditUsagePercent}
            />
            
            {onResume && (
              <Button onClick={onResume} size="lg" className="gap-2 mt-6">
                <Play className="w-5 h-5" />
                Folytatás
              </Button>
            )}
          </div>
        ) : isError ? (
          /* Hiba képernyő */
          <div className="text-center py-10 px-6">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6"
            >
              <AlertCircle className="w-10 h-10 text-destructive" />
            </motion.div>
            
            <h3 className="text-xl font-bold mb-2">Hiba történt</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              {error || "Ismeretlen hiba az írás közben"}
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              {completedScenes} / {totalScenes} {sceneLabel} készült el eddig
            </p>
            
            <div className="flex gap-3 justify-center flex-wrap">
              {onResume && (
                <Button variant="outline" onClick={onResume} className="gap-2">
                  <Play className="w-4 h-4" />
                  Újrapróbálás
                </Button>
              )}
              {onRestartFailed && (failedScenes > 0 || skippedScenes > 0) && (
                <Button onClick={onRestartFailed} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Hibás jelenetek ({failedScenes + skippedScenes})
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Írás közbeni tartalom */
          <div className="p-6">
            {/* Fejléc: Státusz és animált ikon */}
            <div className="flex items-center gap-3 mb-5">
              <div className="relative">
                <motion.div
                  className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-6 h-6 text-primary" />
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary/30"
                  animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <div>
                <h3 className="font-bold text-lg">AI könyvírás folyamatban</h3>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={messageIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm text-muted-foreground"
                  >
                    {messages[messageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Aktuális fejezet/jelenet */}
            <div className="bg-muted/50 rounded-lg p-4 mb-5 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{currentChapter || "Előkészítés..."}</span>
              </div>
              {currentScene && (
                <p className="text-sm text-muted-foreground ml-6">{currentScene}</p>
              )}
            </div>

            {/* Elmosott szöveg előnézet */}
            <div className="relative h-32 overflow-hidden rounded-lg bg-card border border-border/50 mb-5">
              <div 
                className="p-4 text-sm leading-relaxed text-foreground/80 select-none pointer-events-none"
                style={{ filter: 'blur(3px)' }}
              >
                {streamingText || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris..."}
              </div>
              
              {/* Alsó gradiens */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
              
              {/* Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/20">
                <div className="flex items-center gap-2 text-muted-foreground text-sm bg-background/80 px-3 py-1.5 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Írás folyamatban...</span>
                </div>
              </div>
            </div>

            {/* 3D Animált Progress Bar */}
            <div className="mb-4">
              <div className="relative h-6 w-full overflow-hidden rounded-full bg-muted/60 border border-border shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/10" />
                
                <motion.div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{ 
                    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 50%, hsl(var(--primary)) 100%)',
                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2), 0 2px 8px hsl(var(--primary) / 0.4)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/20 rounded-full" />
                  
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                      width: '50%',
                    }}
                    animate={{ x: ["-100%", "300%"] }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      ease: "linear",
                      repeatDelay: 0.5 
                    }}
                  />
                  
                  <div className="absolute inset-x-0 top-0.5 h-1 mx-1 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full" />
                </motion.div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                    {progressPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Idő és progress statisztikák */}
            <div className="flex justify-between text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Eltelt: <span className="font-medium text-foreground">{formatTime(elapsedSeconds)}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Timer className="w-4 h-4" />
                <span>~<span className="font-medium text-foreground">{formatTime(estimatedRemainingSeconds)}</span> van hátra</span>
              </div>
            </div>

            {/* Jelenet és szószám */}
            <div className="flex justify-between text-xs text-muted-foreground mb-4 px-1">
              <div className="flex gap-2">
                <span>{completedScenes}/{totalScenes} {sceneLabel} kész</span>
                {failedScenes > 0 && <span className="text-destructive">{failedScenes} hibás</span>}
                {skippedScenes > 0 && <span className="text-amber-500">{skippedScenes} kihagyva</span>}
              </div>
              <span>{totalWords.toLocaleString()} szó</span>
            </div>

            {/* Kredit információk panel */}
            <CreditPanel 
              usedWordsThisSession={usedWordsThisSession}
              monthlyWordsUsed={monthlyWordsUsed}
              monthlyWordLimit={monthlyWordLimit}
              extraWordsBalance={extraWordsBalance}
              creditUsagePercent={creditUsagePercent}
            />

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Ne zárd be az oldalt!
              </p>
              <Button variant="outline" size="sm" onClick={onPause}>
                <Pause className="w-4 h-4 mr-2" />
                Szünet
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Kredit panel komponens
function CreditPanel({
  usedWordsThisSession,
  monthlyWordsUsed,
  monthlyWordLimit,
  extraWordsBalance,
  creditUsagePercent,
}: {
  usedWordsThisSession: number;
  monthlyWordsUsed: number;
  monthlyWordLimit: number;
  extraWordsBalance: number;
  creditUsagePercent: number;
}) {
  return (
    <div className="bg-muted/40 rounded-lg p-3 mb-4 border border-border/50">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Coins className="w-4 h-4" />
          Kredit felhasználás
        </span>
        <span className="font-medium text-primary">
          -{usedWordsThisSession.toLocaleString()} szó
        </span>
      </div>
      
      {/* Progress bar a havi limithez */}
      <div className="h-2 bg-background rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary/70 transition-all duration-500"
          style={{ width: `${creditUsagePercent}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
        <span>
          {monthlyWordsUsed.toLocaleString()} / {monthlyWordLimit === -1 ? "∞" : monthlyWordLimit.toLocaleString()} havi
        </span>
        {extraWordsBalance > 0 && (
          <span className="text-green-500">+{extraWordsBalance.toLocaleString()} extra</span>
        )}
      </div>
    </div>
  );
}
