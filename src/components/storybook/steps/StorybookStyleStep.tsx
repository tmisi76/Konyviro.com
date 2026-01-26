import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ILLUSTRATION_STYLES, IllustrationStyle } from "@/types/storybook";

interface StorybookStyleStepProps {
  selected: IllustrationStyle | null;
  onSelect: (style: IllustrationStyle) => void;
}

// Sample illustration previews for each style
const STYLE_PREVIEWS: Record<IllustrationStyle, string> = {
  "watercolor": "🎨",
  "cartoon": "🖼️",
  "digital-painting": "💻",
  "hand-drawn": "✏️",
  "pixar-3d": "🎬",
  "classic-fairytale": "📖",
};

export function StorybookStyleStep({ selected, onSelect }: StorybookStyleStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-6xl mb-4">🎨🖌️</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Milyen stílusban készüljenek az illusztrációk?
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Válaszd ki a kedvenc illusztrációs stílust, és az AI ebben a stílusban készíti el a mesekönyv képeit
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
        {ILLUSTRATION_STYLES.map((style, index) => (
          <motion.button
            key={style.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 + 0.2 }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(style.id)}
            className={cn(
              "group relative p-6 rounded-2xl border-2 transition-all duration-300",
              "bg-card hover:bg-accent/5",
              "flex flex-col items-center text-center gap-3",
              selected === style.id
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300",
              "bg-gradient-to-br from-violet-400/20 via-transparent to-pink-400/10",
              "group-hover:opacity-100",
              selected === style.id && "opacity-100"
            )} />

            {/* Style preview placeholder */}
            <div className="relative z-10 w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-4xl">{style.icon}</span>
            </div>

            <div className="relative z-10">
              <h2 className="text-lg font-bold mb-1">{style.title}</h2>
              <p className="text-sm text-muted-foreground">{style.description}</p>
            </div>

            {selected === style.id && (
              <motion.div
                layoutId="style-check"
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}

            {/* Popular badge for Pixar style */}
            {style.id === "pixar-3d" && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                Népszerű
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Style description */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 rounded-xl bg-primary/5 border border-primary/20 max-w-2xl text-center"
        >
          <h3 className="font-semibold text-lg mb-2">
            {ILLUSTRATION_STYLES.find(s => s.id === selected)?.title}
          </h3>
          <p className="text-muted-foreground">
            {selected === "watercolor" && "Lágy, álomszerű akvarell festmények, gyengéd színekkel és finom átmenetekkel. Tökéletes nyugtató, esti mesékhez."}
            {selected === "cartoon" && "Vidám, élénk színű rajzfilm stílus, kifejező karakterekkel. Ideális szórakoztató, kalandos történetekhez."}
            {selected === "digital-painting" && "Modern, részletgazdag digitális festmények, gazdag színvilággal. Professzionális gyerekkönyv megjelenés."}
            {selected === "hand-drawn" && "Meleg, kézzel rajzolt hatás, ceruzás és tintás vonalakkal. Hagyományos, nosztalgikus mesekönyv érzés."}
            {selected === "pixar-3d" && "Modern 3D animációs stílus, aranyos karakterekkel és filmszerű megvilágítással. Mint egy Pixar film!"}
            {selected === "classic-fairytale" && "Klasszikus mesekönyv illusztrációk, varázslatos és elbűvölő stílusban. Az aranykor meséinek hangulata."}
          </p>
        </motion.div>
      )}
    </div>
  );
}
