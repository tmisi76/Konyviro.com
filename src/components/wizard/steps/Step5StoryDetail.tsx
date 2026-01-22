import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { StoryIdea, Genre, Subcategory, Tone } from "@/types/wizard";

interface Step5StoryDetailProps {
  genre: Genre;
  subcategory: Subcategory;
  tone: Tone;
  selectedIdea: StoryIdea;
  existingConcept: string;
  onConceptGenerated: (concept: string) => void;
  onAccept: () => void;
}

export function Step5StoryDetail({
  genre,
  subcategory,
  tone,
  selectedIdea,
  existingConcept,
  onConceptGenerated,
  onAccept,
}: Step5StoryDetailProps) {
  const [concept, setConcept] = useState(existingConcept);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate on mount if no existing concept
  useEffect(() => {
    if (!concept) {
      generateConcept();
    }
  }, []);

  const generateConcept = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-story", {
        body: {
          storyIdea: `${selectedIdea.title}\n\n${selectedIdea.synopsis}\n\nKulcselemek: ${selectedIdea.mainElements.join(", ")}\n\nEgyedi vonás: ${selectedIdea.uniqueSellingPoint}`,
          genre: genre === "fiction" ? subcategory : "szakkonyv",
          tone,
          targetAudience: "general",
        },
      });

      if (error) throw error;
      
      // Build detailed concept from response
      let detailedConcept = "";
      
      if (data.synopsis) {
        detailedConcept += `## Szinopszis\n\n${data.synopsis}\n\n`;
      }
      
      if (data.protagonist) {
        detailedConcept += `## Főszereplő: ${data.protagonist.name}\n`;
        if (data.protagonist.description) detailedConcept += `${data.protagonist.description}\n`;
        if (data.protagonist.innerConflict) detailedConcept += `\n**Belső konfliktus:** ${data.protagonist.innerConflict}\n`;
        if (data.protagonist.arc) detailedConcept += `**Karakterív:** ${data.protagonist.arc}\n`;
        detailedConcept += "\n";
      }
      
      if (data.antagonist) {
        detailedConcept += `## Antagonista: ${data.antagonist.name}\n${data.antagonist.description}\n\n`;
      }
      
      if (data.setting) {
        detailedConcept += `## Helyszín és időszak\n${data.setting}\n\n`;
      }
      
      if (data.themes && data.themes.length > 0) {
        detailedConcept += `## Témák\n${data.themes.map((t: string) => `- ${t}`).join("\n")}\n\n`;
      }
      
      if (data.plotPoints && data.plotPoints.length > 0) {
        detailedConcept += `## Cselekménypontok\n`;
        data.plotPoints.forEach((point: { beat: string; description: string }) => {
          detailedConcept += `\n### ${point.beat}\n${point.description}\n`;
        });
      }
      
      setConcept(detailedConcept);
      onConceptGenerated(detailedConcept);
    } catch (error) {
      console.error("Error generating concept:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("feldolgozni") || errorMessage.includes("parse")) {
        toast.error("A generálás túl hosszú volt. Kérlek próbáld újra.");
      } else {
        toast.error("Hiba történt a koncepció generálása során. Próbáld újra.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChange = (value: string) => {
    setConcept(value);
    onConceptGenerated(value);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-[60vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          {genre === "fiction" ? "Történet kidolgozása" : "Könyv koncepció"}
        </h1>
        <p className="text-muted-foreground text-lg">
          Tekintsd át és szerkeszd a részletes koncepciót
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-4xl"
      >
        {/* AI generated badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI által generált koncepció</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateConcept}
            disabled={isGenerating}
            className="gap-2"
          >
            <RefreshCw className={isGenerating ? "animate-spin w-4 h-4" : "w-4 h-4"} />
            Újragenerálás
          </Button>
        </div>

        {/* Concept editor */}
        {isGenerating ? (
          <div className="space-y-4 p-6 rounded-xl border border-border bg-card">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Textarea
            value={concept}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="A részletes koncepció itt jelenik meg..."
            className="min-h-[400px] font-mono text-sm leading-relaxed resize-y"
          />
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            size="lg"
            onClick={onAccept}
            disabled={isGenerating || !concept}
            className="gap-2"
          >
            <Check className="w-4 h-4" />
            Elfogadom és Tovább
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
