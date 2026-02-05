import { useState } from "react";
import { motion } from "framer-motion";
import { Wand2, Edit3, Clock, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WritingMode = "automatic" | "semiAutomatic";

interface WritingModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: WritingMode) => void;
  isStarting?: boolean;
  estimatedMinutes?: number;
  isStarted?: boolean;
  startError?: string | null;
}

export function WritingModeDialog({
  open,
  onOpenChange,
  onSelectMode,
  isStarting = false,
  estimatedMinutes = 45,
  isStarted = false,
  startError = null,
}: WritingModeDialogProps) {
  const [selectedMode, setSelectedMode] = useState<WritingMode | null>(null);
  const navigate = useNavigate();

  const handleStart = () => {
    if (selectedMode) {
      onSelectMode(selectedMode);
    }
  };

  const handleGoToDashboard = () => {
    onOpenChange(false);
    navigate("/dashboard");
  };

  // Success screen after auto-writing started
  if (isStarted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="mb-6"
            >
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold mb-2">Sikeresen elindult! 🎉</h2>
              <p className="text-muted-foreground mb-6">
                A könyved írása elkezdődött. A Dashboard-on követheted a folyamatot valós időben.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Becsült idő: ~{estimatedMinutes} perc</span>
                </div>
              </div>

              <Button size="lg" onClick={handleGoToDashboard} className="gap-2">
                Vissza a Dashboard-ra
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error screen
  if (startError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Hiba történt</h2>
            <p className="text-muted-foreground mb-6">{startError}</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Bezárás
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Hogyan szeretnéd megírni a könyved?</DialogTitle>
          <DialogDescription>
            Válaszd ki az írás módját
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Automatic Mode Card */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedMode("automatic")}
            className={cn(
              "relative flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all",
              selectedMode === "automatic"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              selectedMode === "automatic" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Wand2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">🤖 Automatikus Könyvírás</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Az AI megírja a teljes könyvet a vázlat alapján. Valós időben látod ahogy íródik.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>~{estimatedMinutes} perc várakozás</span>
              </div>
            </div>
            {selectedMode === "automatic" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-4 top-4 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
              >
                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.button>

          {/* Semi-Automatic Mode Card */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedMode("semiAutomatic")}
            className={cn(
              "relative flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all",
              selectedMode === "semiAutomatic"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              selectedMode === "semiAutomatic" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Edit3 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">✍️ Félautomata Szerkesztés</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Átlépsz a szerkesztőbe, ahol te irányítod az AI eszköztárat. Fejezetenként írathatod meg a tartalmat.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Edit3 className="h-3.5 w-3.5" />
                <span>Teljes kontroll az írás felett</span>
              </div>
            </div>
            {selectedMode === "semiAutomatic" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-4 top-4 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
              >
                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isStarting}>
            Mégse
          </Button>
          <Button
            onClick={handleStart}
            disabled={!selectedMode || isStarting}
            className="min-w-[140px]"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Indítás...
              </>
            ) : selectedMode === "automatic" ? (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Írás Indítása
              </>
            ) : (
              "Tovább"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
