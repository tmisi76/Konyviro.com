import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { Lock } from "lucide-react";
import type { Genre } from "@/types/wizard";
import { StyleProfileBanner } from "@/components/style/StyleProfileBanner";

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
  {
    id: "mesekonyv",
    icon: "🧸",
    title: "Mesekönyv",
    description: "Személyre szabott gyerekkönyvek fotókkal",
  },
];

export function Step1Genre({ selected, onSelect }: Step1GenreProps) {
  const { profile, isLoading } = useProfile();
  
  // Check if user has storybook credits
  const hasStorybookCredits = profile.storybookCreditLimit > profile.storybookCreditsUsed;
  const remainingStorybookCredits = Math.max(0, profile.storybookCreditLimit - profile.storybookCreditsUsed);

  const handleGenreSelect = (genreId: Genre) => {
    // Block mesekonyv selection if no credits
    if (genreId === "mesekonyv" && !hasStorybookCredits && !isLoading) {
      return;
    }
    onSelect(genreId);
  };

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

      <div className="w-full max-w-4xl mb-8">
        <StyleProfileBanner />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {GENRES.map((genre, index) => {
          const isStorybook = genre.id === "mesekonyv";
          const isDisabled = isStorybook && !hasStorybookCredits && !isLoading;
          
          return (
            <motion.button
              key={genre.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              whileHover={!isDisabled ? { scale: 1.03, y: -4 } : undefined}
              whileTap={!isDisabled ? { scale: 0.98 } : undefined}
              onClick={() => handleGenreSelect(genre.id)}
              disabled={isDisabled}
              className={cn(
                "group relative p-8 rounded-2xl border-2 transition-all duration-300",
                "bg-card flex flex-col items-center text-center gap-4",
                isDisabled 
                  ? "opacity-60 cursor-not-allowed border-border"
                  : "hover:bg-accent/5",
                selected === genre.id
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : !isDisabled && "border-border hover:border-primary/50",
                isStorybook && !isDisabled && "ring-2 ring-amber-400/30"
              )}
            >
              {/* Gradient glow effect */}
              {!isDisabled && (
                <div className={cn(
                  "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300",
                  "bg-gradient-to-br from-primary/20 via-transparent to-primary/10",
                  "group-hover:opacity-100",
                  selected === genre.id && "opacity-100"
                )} />
              )}

              {/* New badge or credit indicator for storybook */}
              {isStorybook && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className={cn(
                    "absolute -top-2 -right-2 text-white text-xs font-bold px-2 py-1 rounded-full",
                    isDisabled 
                      ? "bg-muted-foreground" 
                      : "bg-amber-500"
                  )}
                >
                  {isDisabled ? (
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Elfogyott
                    </span>
                  ) : (
                    <span>{remainingStorybookCredits} db maradt</span>
                  )}
                </motion.div>
              )}

              <span className="text-6xl relative z-10">{genre.icon}</span>
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2">{genre.title}</h2>
                <p className="text-muted-foreground">{genre.description}</p>
              </div>

              {selected === genre.id && !isDisabled && (
                <motion.div
                  layoutId="genre-check"
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}

              {/* Lock overlay for disabled */}
              {isDisabled && (
                <div className="absolute inset-0 rounded-2xl bg-background/50 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}