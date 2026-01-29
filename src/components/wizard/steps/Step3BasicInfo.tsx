import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";
import type { Tone, Genre } from "@/types/wizard";
import { TONES, BOOK_LENGTH_PRESETS } from "@/types/wizard";

interface Step3BasicInfoProps {
  genre: Genre;
  initialData: {
    title: string;
    storyDescription: string;
    targetAudience: string;
    tone: Tone | null;
    length: number | null;
    additionalInstructions: string;
  };
  onSubmit: (data: {
    title: string;
    storyDescription: string;
    targetAudience: string;
    tone: Tone;
    length: number;
    additionalInstructions: string;
  }) => void;
}

export function Step3BasicInfo({ genre, initialData, onSubmit }: Step3BasicInfoProps) {
  const [title, setTitle] = useState(initialData.title);
  const [storyDescription, setStoryDescription] = useState(initialData.storyDescription);
  const [targetAudience, setTargetAudience] = useState(initialData.targetAudience);
  const [tone, setTone] = useState<Tone | null>(initialData.tone);
  const [length, setLength] = useState<number>(initialData.length || 25000);
  const [additionalInstructions, setAdditionalInstructions] = useState(initialData.additionalInstructions);

  const canSubmit = tone && length >= 1000;

  const handleSubmit = () => {
    if (!tone || !length) return;
    onSubmit({
      title,
      storyDescription,
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

        {/* Story Description - NEW FIELD */}
        <div className="space-y-2">
          <Label htmlFor="storyDescription" className="text-base font-semibold">
            Történet leírása <span className="text-primary">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Ez 80%-ban befolyásolja a generált ötleteket. Írd le részletesen, miről szóljon a könyved!
          </p>
          <Textarea
            id="storyDescription"
            value={storyDescription}
            onChange={(e) => setStoryDescription(e.target.value)}
            placeholder={genre === "fiction" 
              ? "Pl. Egy fiatal nő örökli nagyanyja titkos naplóját, ami egy elveszett kincshez vezető nyomokat tartalmaz. A főhős Olaszországba utazik, ahol egy rejtélyes férfivel összefogva fedezi fel a család múltjának titkait, miközben szerelem szövődik közöttük..."
              : "Pl. Egy gyakorlati útmutató kisvállalkozóknak a digitális marketing alapjairól. A könyv bemutatja, hogyan építsenek social media jelenlétet nulláról, hogyan szerezzenek organikus követőket, és hogyan alakítsák vásárlóvá az érdeklődőket..."}
            className="min-h-[150px] resize-y"
          />
          {storyDescription.length > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              {storyDescription.length} karakter
            </p>
          )}
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

        {/* Length - Csúszka */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base">Tervezett hosszúság</Label>
            <span className="text-lg font-bold text-primary">
              {length.toLocaleString("hu-HU")} szó
            </span>
          </div>

          <Slider
            value={[length]}
            onValueChange={([value]) => setLength(value)}
            min={1000}
            max={50000}
            step={1000}
            className="py-4"
          />

          {/* Skála jelzők */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1,000</span>
            <span>10,000</span>
            <span>25,000</span>
            <span>50,000</span>
          </div>

          {/* Gyors preset gombok */}
          <div className="flex gap-2 justify-center">
            {BOOK_LENGTH_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setLength(preset.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border transition-all",
                  length === preset.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40"
                )}
              >
                {preset.label}
              </button>
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
