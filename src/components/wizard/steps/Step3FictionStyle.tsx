import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, Gauge, MessageSquare, Palette, MapPin, Shield } from "lucide-react";
import type { 
  POVType, 
  PaceType, 
  DialogueRatio, 
  DescriptionLevel, 
  AgeRating,
  FictionStyleSettings,
  Subcategory 
} from "@/types/wizard";
import { 
  POV_OPTIONS, 
  PACE_OPTIONS, 
  DIALOGUE_OPTIONS, 
  DESCRIPTION_OPTIONS, 
  AGE_RATING_OPTIONS 
} from "@/types/wizard";

interface Step3FictionStyleProps {
  subcategory: Subcategory | null;
  initialData: FictionStyleSettings | null;
  onSubmit: (data: FictionStyleSettings) => void;
}

export function Step3FictionStyle({ subcategory, initialData, onSubmit }: Step3FictionStyleProps) {
  const [pov, setPov] = useState<POVType>(initialData?.pov || "third_limited");
  const [pace, setPace] = useState<PaceType>(initialData?.pace || "moderate");
  const [dialogueRatio, setDialogueRatio] = useState<DialogueRatio>(initialData?.dialogueRatio || "balanced");
  const [descriptionLevel, setDescriptionLevel] = useState<DescriptionLevel>(initialData?.descriptionLevel || "moderate");
  const [setting, setSetting] = useState(initialData?.setting || "");
  const [ageRating, setAgeRating] = useState<AgeRating>(
    initialData?.ageRating || (subcategory === "erotikus" ? "explicit" : "adult")
  );

  const handleSubmit = () => {
    onSubmit({
      pov,
      pace,
      dialogueRatio,
      descriptionLevel,
      setting,
      ageRating,
    });
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-[60vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Írói stílus beállítások
        </h1>
        <p className="text-muted-foreground text-lg">
          Határozd meg, hogyan szóljon a regényed
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-3xl space-y-8"
      >
        {/* POV Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-primary" />
            <Label className="text-base font-semibold">Nézőpont</Label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {POV_OPTIONS.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPov(option.id)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  pov === option.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <div className="font-bold mb-1">{option.label}</div>
                <div className="text-sm text-muted-foreground">{option.description}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Pace Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-5 h-5 text-primary" />
            <Label className="text-base font-semibold">Tempó</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {PACE_OPTIONS.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPace(option.id)}
                className={cn(
                  "px-4 py-2 rounded-full border-2 transition-all",
                  pace === option.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <span className="font-medium">{option.label}</span>
              </motion.button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {PACE_OPTIONS.find(o => o.id === pace)?.description}
          </p>
        </div>

        {/* Dialogue Ratio */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <Label className="text-base font-semibold">Párbeszédek aránya</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIALOGUE_OPTIONS.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDialogueRatio(option.id)}
                className={cn(
                  "px-4 py-2 rounded-full border-2 transition-all",
                  dialogueRatio === option.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <span className="font-medium">{option.label}</span>
              </motion.button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {DIALOGUE_OPTIONS.find(o => o.id === dialogueRatio)?.description}
          </p>
        </div>

        {/* Description Level */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-5 h-5 text-primary" />
            <Label className="text-base font-semibold">Leírások részletessége</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {DESCRIPTION_OPTIONS.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDescriptionLevel(option.id)}
                className={cn(
                  "px-4 py-2 rounded-full border-2 transition-all",
                  descriptionLevel === option.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <span className="font-medium">{option.label}</span>
              </motion.button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {DESCRIPTION_OPTIONS.find(o => o.id === descriptionLevel)?.description}
          </p>
        </div>

        {/* Setting/Era */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <Label htmlFor="setting" className="text-base font-semibold">
              Helyszín / Korszak <span className="text-muted-foreground font-normal">(opcionális)</span>
            </Label>
          </div>
          <Input
            id="setting"
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            placeholder="Pl. modern Budapest, középkori Anglia, sci-fi űrállomás..."
            className="h-12"
          />
          <p className="text-sm text-muted-foreground">
            Add meg, hol és mikor játszódik a történeted
          </p>
        </div>

        {/* Age Rating */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <Label className="text-base font-semibold">Korhatár</Label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AGE_RATING_OPTIONS.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAgeRating(option.id)}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all text-center",
                  ageRating === option.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <div className="font-bold text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <Button
            size="lg"
            onClick={handleSubmit}
            className="gap-2"
          >
            Tovább
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}