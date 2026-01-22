import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Genre } from "@/types/wizard";

interface Step1GenreProps {
  selected: Genre | null;
  onSelect: (genre: Genre) => void;
}

const GENRES: { id: Genre; icon: string; title: string; description: string }[] = [
  {
    id: "szakkonyv",
    icon: "📚",
    title: "Szakkönyv",
    description: "Tudásmegosztás, oktatás, szakmai tartalom",
  },
  {
    id: "fiction",
    icon: "✨",
    title: "Fiction",
    description: "Regények, novellák, kreatív történetek",
  },
];

export function Step1Genre({ selected, onSelect }: Step1GenreProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Milyen könyvet szeretnél írni?
        </h1>
        <p className="text-muted-foreground text-lg">
          Válaszd ki a műfajt, és segítünk megírni a könyvedet
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {GENRES.map((genre, index) => (
          <motion.button
            key={genre.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.2 }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(genre.id)}
            className={cn(
              "group relative p-8 rounded-2xl border-2 transition-all duration-300",
              "bg-card hover:bg-accent/5",
              "flex flex-col items-center text-center gap-4",
              selected === genre.id
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            {/* Gradient glow effect */}
            <div className={cn(
              "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300",
              "bg-gradient-to-br from-primary/20 via-transparent to-primary/10",
              "group-hover:opacity-100",
              selected === genre.id && "opacity-100"
            )} />

            <span className="text-6xl relative z-10">{genre.icon}</span>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2">{genre.title}</h2>
              <p className="text-muted-foreground">{genre.description}</p>
            </div>

            {selected === genre.id && (
              <motion.div
                layoutId="genre-check"
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
