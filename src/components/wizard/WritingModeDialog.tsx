import { useState } from "react";
import { motion } from "framer-motion";
import { Wand2, Edit3, Clock, Sparkles, Loader2, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WritingMode = "automatic" | "semiAutomatic" | "checkpoint";

interface WritingModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: WritingMode) => void;
  isStarting?: boolean;
  estimatedMinutes?: number;
}

export function WritingModeDialog({
  open,
  onOpenChange,
  onSelectMode,
  isStarting = false,
  estimatedMinutes = 45,
}: WritingModeDialogProps) {
  const [selectedMode, setSelectedMode] = useState<WritingMode | null>(null);

  const handleStart = () => {
    if (selectedMode) {
      onSelectMode(selectedMode);
    }
  };

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

          {/* Checkpoint Mode Card - NEW */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedMode("checkpoint")}
            className={cn(
              "relative flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all",
              selectedMode === "checkpoint"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              selectedMode === "checkpoint" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">✅ Fejezetenkénti Jóváhagyás</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Az AI megírja a fejezetet, majd megáll a jóváhagyásodra. Ellenőrizheted, szerkesztheted, vagy újragenerálhatod.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Kontroll minden fejezet felett</span>
              </div>
            </div>
            {selectedMode === "checkpoint" && (
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
            ) : (
              "Tovább"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
