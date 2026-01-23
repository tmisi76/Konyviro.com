import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Pause, BookOpen, Sparkles } from "lucide-react";

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
  onPause: () => void;
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
  onPause,
}: WritingProgressModalProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  // Válaszd ki a megfelelő üzenet listát
  const messages = status === "generating_outline" 
    ? OUTLINE_MESSAGES 
    : isNonFiction 
      ? NONFICTION_MESSAGES 
      : WRITING_MESSAGES;

  // Rotáló üzenet minden 4 másodpercben
  useEffect(() => {
    if (!open || status === "paused" || status === "completed") return;
    
    const interval = setInterval(() => {
      setMessageIndex(i => (i + 1) % messages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [open, status, messages.length]);

  const progressPercent = totalScenes > 0 
    ? Math.round((completedScenes / totalScenes) * 100) 
    : 0;

  const sceneLabel = isNonFiction ? "szekció" : "jelenet";

  // Ne jelenjen meg ha nem írunk
  if (status !== "writing" && status !== "generating_outline") {
    return null;
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl [&>button]:hidden">
        {/* Fejléc: státusz és animáció */}
        <div className="flex items-center gap-3 mb-4">
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
            <h3 className="font-bold text-lg">AI Könyvírás folyamatban</h3>
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
        <div className="bg-muted rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{currentChapter || "Előkészítés..."}</span>
          </div>
          {currentScene && (
            <div className="text-sm text-muted-foreground pl-6">
              {currentScene}
            </div>
          )}
        </div>

        {/* Elmosott szöveg előnézet */}
        <div className="relative h-48 overflow-hidden rounded-lg bg-card border">
          <div 
            className="p-4 select-none pointer-events-none text-sm leading-relaxed text-foreground/80"
            style={{ filter: 'blur(3px)' }}
          >
            {streamingText || `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.`}
          </div>
          
          {/* Folyamatos írás animáció - alsó gradiens */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
          
          {/* Typing indicator */}
          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Írás folyamatban...</span>
          </motion.div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{completedScenes}/{totalScenes} {sceneLabel} kész</span>
            <span>{totalWords.toLocaleString()} szó</span>
          </div>
        </div>

        {/* Footer gombok */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Kérlek ne zárd be az oldalt, amíg az írás folyamatban van.
          </p>
          <Button variant="outline" size="sm" onClick={onPause}>
            <Pause className="w-4 h-4 mr-2" />
            Szünet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
