import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { STORYBOOK_THEMES, StorybookTheme } from "@/types/storybook";

interface StorybookThemeStepProps {
  selected: StorybookTheme | null;
  customDescription?: string;
  onSelect: (theme: StorybookTheme) => void;
  onCustomDescriptionChange: (description: string) => void;
}

export function StorybookThemeStep({ 
  selected, 
  customDescription,
  onSelect,
  onCustomDescriptionChange,
}: StorybookThemeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-6xl mb-4">📚✨</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Milyen meséről álmodsz?
        </h1>
        <p className="text-muted-foreground text-lg">
          Válaszd ki a mese témáját, és varázslatos történetet alkotunk
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
        {STORYBOOK_THEMES.map((theme, index) => (
          <motion.button
            key={theme.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 + 0.2 }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(theme.id)}
            className={cn(
              "group relative p-6 rounded-2xl border-2 transition-all duration-300",
              "bg-card hover:bg-accent/5",
              "flex flex-col items-center text-center gap-3",
              selected === theme.id
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300",
              "bg-gradient-to-br from-amber-400/20 via-transparent to-orange-400/10",
              "group-hover:opacity-100",
              selected === theme.id && "opacity-100"
            )} />

            <span className="text-4xl relative z-10">{theme.icon}</span>
            <div className="relative z-10">
              <h2 className="text-lg font-bold mb-1">{theme.title}</h2>
              <p className="text-sm text-muted-foreground">{theme.description}</p>
            </div>

            {selected === theme.id && (
              <motion.div
                layoutId="theme-check"
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Custom theme description */}
      {selected === "custom" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="w-full max-w-2xl mt-6"
        >
          <Label htmlFor="custom-description" className="text-base font-medium">
            Írd le a saját történet ötletedet
          </Label>
          <Textarea
            id="custom-description"
            value={customDescription || ""}
            onChange={(e) => onCustomDescriptionChange(e.target.value)}
            placeholder="Pl.: Egy kis hercegnő, aki egy varázslatos kertben találkozik beszélő virágokkal..."
            className="mt-2 min-h-[120px]"
          />
        </motion.div>
      )}
    </div>
  );
}
