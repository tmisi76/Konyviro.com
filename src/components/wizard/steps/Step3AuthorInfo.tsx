import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, MessageSquare, Briefcase, BookOpen, Target } from "lucide-react";
import type { AuthorProfile } from "@/types/wizard";

interface Step3AuthorInfoProps {
  initialData: AuthorProfile | null;
  onSubmit: (data: AuthorProfile) => void;
}

export function Step3AuthorInfo({ initialData, onSubmit }: Step3AuthorInfoProps) {
  const [authorName, setAuthorName] = useState(initialData?.authorName || "");
  const [formality, setFormality] = useState<"tegez" | "magaz">(initialData?.formality || "tegez");
  const [authorBackground, setAuthorBackground] = useState(initialData?.authorBackground || "");
  const [personalStories, setPersonalStories] = useState(initialData?.personalStories || "");
  const [mainPromise, setMainPromise] = useState(initialData?.mainPromise || "");

  const canSubmit = authorName.trim().length >= 2;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      authorName: authorName.trim(),
      formality,
      authorBackground: authorBackground.trim(),
      personalStories: personalStories.trim(),
      mainPromise: mainPromise.trim(),
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
          Szerzői profil
        </h1>
        <p className="text-muted-foreground text-lg">
          Az AI a te nevedben és stílusodban fog írni
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-2xl space-y-6"
      >
        {/* Author Name */}
        <div className="space-y-2">
          <Label htmlFor="authorName" className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Szerző neve <span className="text-destructive">*</span>
          </Label>
          <Input
            id="authorName"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Pl. Kovács János"
            className="h-12"
          />
          <p className="text-sm text-muted-foreground">
            Ezen a néven fog megjelenni a könyvben az első személyű megszólalás
          </p>
        </div>

        {/* Formality Toggle */}
        <div className="space-y-3">
          <Label className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Megszólítás
          </Label>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFormality("tegez")}
              className={cn(
                "flex-1 p-4 rounded-xl border-2 transition-all text-left",
                formality === "tegez"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="font-bold mb-1">Tegezés</div>
              <div className="text-sm text-muted-foreground">
                "Gondold át, hogyan...", "Te is megtapasztalhattad..."
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFormality("magaz")}
              className={cn(
                "flex-1 p-4 rounded-xl border-2 transition-all text-left",
                formality === "magaz"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="font-bold mb-1">Magázás</div>
              <div className="text-sm text-muted-foreground">
                "Gondolja át, hogyan...", "Ön is megtapasztalhatta..."
              </div>
            </motion.button>
          </div>
        </div>

        {/* Author Background */}
        <div className="space-y-2">
          <Label htmlFor="authorBackground" className="text-base flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Szerzői háttér, szakértelem
          </Label>
          <Textarea
            id="authorBackground"
            value={authorBackground}
            onChange={(e) => setAuthorBackground(e.target.value)}
            placeholder="Pl. 15 éve dolgozom az IT szektorban, ebből 10 évet vezető pozícióban töltöttem. Több mint 100 startuppal dolgoztam együtt..."
            className="min-h-[100px]"
          />
          <p className="text-sm text-muted-foreground">
            Ez adja a hitelességet - az AI erre fog hivatkozni a könyvben
          </p>
        </div>

        {/* Personal Stories */}
        <div className="space-y-2">
          <Label htmlFor="personalStories" className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Személyes történetek, esettanulmányok
          </Label>
          <Textarea
            id="personalStories"
            value={personalStories}
            onChange={(e) => setPersonalStories(e.target.value)}
            placeholder="Pl. Volt egy ügyfelünk aki 3 hónap alatt megduplázta a bevételét... Egyszer egy prezentáció közben rájöttem, hogy..."
            className="min-h-[120px]"
          />
          <p className="text-sm text-muted-foreground">
            Ezeket a történeteket építi be az AI a fejezetekbe példaként
          </p>
        </div>

        {/* Main Promise */}
        <div className="space-y-2">
          <Label htmlFor="mainPromise" className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            Fő ígéret az olvasónak
          </Label>
          <Input
            id="mainPromise"
            value={mainPromise}
            onChange={(e) => setMainPromise(e.target.value)}
            placeholder="Pl. Megtanulod, hogyan építs profitábilis online vállalkozást 6 hónap alatt"
            className="h-12"
          />
          <p className="text-sm text-muted-foreground">
            Mit fog elérni az olvasó, ha végigolvassa a könyvet?
          </p>
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
