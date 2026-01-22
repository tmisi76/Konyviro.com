import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { Tone, BookLength, Genre } from "@/types/wizard";
import { TONES, BOOK_LENGTHS } from "@/types/wizard";

interface Step3BasicInfoProps {
  genre: Genre;
  initialData: {
    title: string;
    targetAudience: string;
    tone: Tone | null;
    length: BookLength | null;
    additionalInstructions: string;
  };
  onSubmit: (data: {
    title: string;
    targetAudience: string;
    tone: Tone;
    length: BookLength;
    additionalInstructions: string;
  }) => void;
}

export function Step3BasicInfo({ genre, initialData, onSubmit }: Step3BasicInfoProps) {
  const [title, setTitle] = useState(initialData.title);
  const [targetAudience, setTargetAudience] = useState(initialData.targetAudience);
  const [tone, setTone] = useState<Tone | null>(initialData.tone);
  const [length, setLength] = useState<BookLength | null>(initialData.length);
  const [additionalInstructions, setAdditionalInstructions] = useState(initialData.additionalInstructions);

  const canSubmit = tone && length;

  const handleSubmit = () => {
    if (!tone || !length) return;
    onSubmit({
      title,
      targetAudience,
      tone,
      length,
      additionalInstructions,
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
          Alapadatok megadása
        </h1>
        <p className="text-muted-foreground text-lg">
          Add meg a könyved alapvető jellemzőit
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-2xl space-y-6"
      >
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-base">
            Könyv címe <span className="text-muted-foreground">(opcionális)</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hagyd üresen, AI generál..."
            className="h-12"
          />
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label htmlFor="audience" className="text-base">
            Célközönség
          </Label>
          <Textarea
            id="audience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder={genre === "fiction" 
              ? "Pl. 25-40 éves nők, akik szeretik a romantikus és kalandos történeteket..."
              : "Pl. Kezdő vállalkozók, akik szeretnék megtanulni a marketing alapjait..."}
            className="min-h-[80px]"
          />
        </div>

        {/* Tone */}
        <div className="space-y-3">
          <Label className="text-base">Hangnem</Label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTone(t.id)}
                className={cn(
                  "px-4 py-2 rounded-full border-2 transition-all",
                  "flex items-center gap-2",
                  tone === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <span>{t.icon}</span>
                <span className="font-medium">{t.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Length */}
        <div className="space-y-3">
          <Label className="text-base">Tervezett hosszúság</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {BOOK_LENGTHS.map((l) => (
              <motion.button
                key={l.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLength(l.id)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  length === l.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <div className="font-bold mb-1">{l.label}</div>
                <div className="text-sm text-muted-foreground">{l.words}</div>
                <div className="text-xs text-muted-foreground">{l.chapters}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Additional Instructions */}
        <div className="space-y-2">
          <Label htmlFor="instructions" className="text-base">
            Egyéb instrukciók <span className="text-muted-foreground">(opcionális)</span>
          </Label>
          <Textarea
            id="instructions"
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            placeholder="Bármilyen további útmutatás, amit figyelembe vegyen az AI..."
            className="min-h-[100px]"
          />
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <Button
            size="lg"
            disabled={!canSubmit}
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
