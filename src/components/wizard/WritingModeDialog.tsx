import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, Cloud, Clock, Mail, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WritingMode = "live" | "background";

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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Hogyan szeretnéd megírni a könyved?</DialogTitle>
          <DialogDescription>
            A könyv megírása kb. {estimatedMinutes} percet vesz igénybe
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Live Mode Card */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedMode("live")}
            className={cn(
              "relative flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all",
              selectedMode === "live"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              selectedMode === "live" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Eye className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">🔴 Élő Írás</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Valós időben látod ahogy íródik a könyved. Az oldalt nyitva kell tartanod a generálás végéig.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>~{estimatedMinutes} perc várakozás</span>
              </div>
            </div>
            {selectedMode === "live" && (
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

          {/* Background Mode Card */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedMode("background")}
            className={cn(
              "relative flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all",
              selectedMode === "background"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              selectedMode === "background" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Cloud className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">🟢 Háttérben Írás</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                A szerver írja meg a könyved a háttérben. Bezárhatod az oldalt, emailben értesítünk ha kész.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>Email értesítés a befejezéskor</span>
              </div>
            </div>
            {selectedMode === "background" && (
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
              "Könyv Írása"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
