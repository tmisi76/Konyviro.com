import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Sparkles, Lightbulb } from "lucide-react";
import { STORYBOOK_THEMES, StorybookTheme } from "@/types/storybook";
import { toast } from "sonner";

interface StorybookStoryStepProps {
  title: string;
  storyPrompt: string;
  theme: StorybookTheme | null;
  onTitleChange: (title: string) => void;
  onStoryPromptChange: (prompt: string) => void;
  onComplete: () => void;
}

const STORY_SUGGESTIONS: Record<StorybookTheme, string[]> = {
  adventure: [
    "Egy varázslatos erdőben talál egy titkos térképet",
    "Felfedez egy rejtett szigetet a kertben",
    "Egy időgéppel a dinoszauruszok korába utazik",
  ],
  friendship: [
    "Egy félénk kisállattal barátkozik össze",
    "Segít egy új szomszédnak beilleszkedni",
    "Megtanul együtt játszani másokkal",
  ],
  family: [
    "Nagymamával süteményt süt",
    "Családi kirándulásra megy a hegyekbe",
    "Testvérével közös kalandba keveredik",
  ],
  animals: [
    "Beszélő állatokkal találkozik az állatkertben",
    "Egy elveszett kiskutyát segít hazatalálni",
    "Az erdei állatok meghívják egy ünnepségre",
  ],
  magic: [
    "Varázspálcát talál a padláson",
    "Megtanulja az első varázsigét",
    "Egy varázslatos lénnyel barátkozik",
  ],
  nature: [
    "Felfedezi a kert titkos életét",
    "Megtanulja a virágok nyelvét",
    "Egy pillangóval utazik a réten",
  ],
  bedtime: [
    "Az álomtündér meglátogatja",
    "A holddal beszélget lefekvés előtt",
    "Puha felhőkön utazik álomországba",
  ],
  learning: [
    "Megtanulja a számokat egy játékos kalandon",
    "A betűk életre kelnek és mesélnek",
    "A színek varázslatos világát fedezi fel",
  ],
  custom: [],
};

export function StorybookStoryStep({
  title,
  storyPrompt,
  theme,
  onTitleChange,
  onStoryPromptChange,
  onComplete,
}: StorybookStoryStepProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = theme ? STORY_SUGGESTIONS[theme] : [];
  const themeInfo = theme ? STORYBOOK_THEMES.find(t => t.id === theme) : null;

  const handleContinue = () => {
    if (!title.trim()) {
      toast.error("Add meg a mese címét");
      return;
    }
    if (!storyPrompt.trim()) {
      toast.error("Írd le röviden a történetet");
      return;
    }
    onComplete();
  };

  const handleSuggestionClick = (suggestion: string) => {
    onStoryPromptChange(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="flex flex-col items-center min-h-[60vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-6xl mb-4">📝✨</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Miről szóljon a mese?
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Add meg a mese címét és írd le röviden a történetet. Az AI ebből készíti el a teljes mesét és az illusztrációkat.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-2xl space-y-6"
      >
        {/* Title input */}
        <div>
          <Label htmlFor="title" className="text-base font-medium">
            A mese címe *
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Pl.: Bence és a varázslatos erdő"
            className="mt-2 text-lg"
          />
        </div>

        {/* Story prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="story-prompt" className="text-base font-medium">
              A történet rövid leírása *
            </Label>
            {suggestions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="gap-1 text-primary"
              >
                <Lightbulb className="w-4 h-4" />
                Ötletek
              </Button>
            )}
          </div>
          
          <Textarea
            id="story-prompt"
            value={storyPrompt}
            onChange={(e) => onStoryPromptChange(e.target.value)}
            placeholder={themeInfo?.samplePrompt || "Írd le röviden, mi történjen a mesében..."}
            className="min-h-[150px]"
          />
          
          <p className="text-sm text-muted-foreground mt-2">
            Minél részletesebb a leírás, annál személyesebb lesz a mese. Említsd meg a szereplők nevét is!
          </p>
        </div>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <p className="text-sm font-medium text-muted-foreground">
              Válassz egy ötletet vagy inspirálódj:
            </p>
            <div className="grid gap-2">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="p-3 text-left rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <span className="text-primary mr-2">💡</span>
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Example box */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Példa egy jó leírásra
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            "Bence egy nap talál egy csillogó térképet a kertben. A térkép egy titkos ösvényt mutat, 
            ami a varázslatos erdőbe vezet. Útközben beszélő állatokkal találkozik, akik segítenek 
            megtalálni az erdő szívében rejtőző kincsesládát. A kaland végén megtanulja, 
            hogy a legnagyobb kincs a barátság."
          </p>
        </div>

        {/* Continue button */}
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!title.trim() || !storyPrompt.trim()}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Mese generálása
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
