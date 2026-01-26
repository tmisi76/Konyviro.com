import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AGE_GROUPS, AgeGroup } from "@/types/storybook";

interface StorybookAgeGroupStepProps {
  selected: AgeGroup | null;
  onSelect: (ageGroup: AgeGroup) => void;
}

export function StorybookAgeGroupStep({ selected, onSelect }: StorybookAgeGroupStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-6xl mb-4">👶👧👦</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Kinek készül a mese?
        </h1>
        <p className="text-muted-foreground text-lg">
          A korosztály határozza meg a történet hosszát és komplexitását
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {AGE_GROUPS.map((group, index) => (
          <motion.button
            key={group.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.2 }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(group.id)}
            className={cn(
              "group relative p-8 rounded-2xl border-2 transition-all duration-300",
              "bg-card hover:bg-accent/5",
              "flex flex-col items-center text-center gap-4",
              selected === group.id
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300",
              "bg-gradient-to-br from-pink-400/20 via-transparent to-purple-400/10",
              "group-hover:opacity-100",
              selected === group.id && "opacity-100"
            )} />

            <div className="relative z-10 text-5xl font-bold text-primary">
              {group.id === "0-3" && "👶"}
              {group.id === "3-6" && "👧"}
              {group.id === "6-9" && "👦"}
            </div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2">{group.title}</h2>
              <p className="text-muted-foreground mb-4">{group.description}</p>
              
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span>📖 {group.pageCount} oldal</span>
                <span>✍️ ~{group.wordCountPerPage} szó/oldal</span>
              </div>
            </div>

            {selected === group.id && (
              <motion.div
                layoutId="age-check"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
