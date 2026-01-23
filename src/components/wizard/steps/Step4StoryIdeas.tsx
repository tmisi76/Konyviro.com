import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { StoryIdea, Genre, Subcategory, Tone, BookLength, AuthorProfile, FictionStyleSettings } from "@/types/wizard";

interface Step4StoryIdeasProps {
  genre: Genre;
  subcategory: Subcategory;
  tone: Tone;
  length: BookLength;
  targetAudience: string;
  additionalInstructions: string;
  existingIdeas: StoryIdea[];
  onIdeasGenerated: (ideas: StoryIdea[]) => void;
  onSelect: (idea: StoryIdea) => void;
  authorProfile?: AuthorProfile | null;
  fictionStyle?: FictionStyleSettings | null;
}

export function Step4StoryIdeas({
  genre,
  subcategory,
  tone,
  length,
  targetAudience,
  additionalInstructions,
  existingIdeas,
  onIdeasGenerated,
  onSelect,
  authorProfile,
}: Step4StoryIdeasProps) {
  const [ideas, setIdeas] = useState<StoryIdea[]>(existingIdeas);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Sync local state with prop changes
  useEffect(() => {
    setIdeas(existingIdeas);
  }, [existingIdeas]);

  // Generate ideas when existingIdeas becomes empty
  useEffect(() => {
    if (existingIdeas.length === 0 && !isGenerating) {
      generateIdeas();
    }
  }, [existingIdeas.length]);

  const generateIdeas = async () => {
    setIsGenerating(true);
    setSelectedId(null);
    
    // Előző ötletek címei az egyediség biztosításához
    const previousTitles = ideas.map(i => i.title);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-story-ideas", {
        body: {
          genre,
          subcategory,
          tone,
          length,
          targetAudience,
          additionalInstructions,
          authorProfile: authorProfile || undefined,
          previousIdeas: previousTitles.length > 0 ? previousTitles : undefined,
        },
      });

      if (error) throw error;
      
      const newIdeas = data.ideas as StoryIdea[];
      setIdeas(newIdeas);
      onIdeasGenerated(newIdeas);
    } catch (error) {
      console.error("Error generating ideas:", error);
      toast.error("Hiba történt az ötletek generálása során");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = (idea: StoryIdea) => {
    setSelectedId(idea.id);
    // Small delay for visual feedback
    setTimeout(() => {
      onSelect(idea);
    }, 300);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-[60vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          {genre === "szakkonyv" ? "Válassz egy könyv ötletet" : "Válassz egy sztori ötletet"}
        </h1>
        <p className="text-muted-foreground text-lg">
          Az AI 3 egyedi ötletet generált a beállításaid alapján
        </p>
      </motion.div>

      {/* Regenerate button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Button
          variant="outline"
          onClick={generateIdeas}
          disabled={isGenerating}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
          Újragenerálás
        </Button>
      </motion.div>

      {/* Ideas grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            // Loading skeletons
            [1, 2, 3].map((i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-24 w-full mb-4" />
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </motion.div>
            ))
          ) : (
            ideas.map((idea, index) => (
              <motion.button
                key={idea.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4, boxShadow: "0 10px 40px -10px hsl(var(--primary) / 0.3)" }}
                onClick={() => handleSelect(idea)}
                className={cn(
                  "text-left rounded-2xl border-2 p-6 transition-all",
                  "bg-card hover:bg-accent/5",
                  selectedId === idea.id
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-border hover:border-primary/50"
                )}
              >
                {/* Title */}
                <h3 className="text-xl font-bold mb-3 line-clamp-2">{idea.title}</h3>

                {/* Synopsis */}
                <p className="text-muted-foreground mb-4 line-clamp-4">
                  {idea.synopsis}
                </p>

                {/* Main elements */}
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">
                    {genre === "fiction" ? "Főbb karakterek/témák:" : "Kulcstémák:"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {idea.mainElements.slice(0, 4).map((element, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                      >
                        {element}
                      </span>
                    ))}
                  </div>
                </div>

                {/* USP */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium line-clamp-2">
                    {idea.uniqueSellingPoint}
                  </span>
                </div>

                {selectedId === idea.id && (
                  <motion.div
                    layoutId="idea-selected"
                    className="absolute inset-0 rounded-2xl border-2 border-primary pointer-events-none"
                  />
                )}
              </motion.button>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
