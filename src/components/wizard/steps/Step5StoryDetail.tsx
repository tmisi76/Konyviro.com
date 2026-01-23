import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { StoryIdea, Genre, Subcategory, Tone, AuthorProfile, FictionStyleSettings } from "@/types/wizard";

interface Step5StoryDetailProps {
  genre: Genre;
  subcategory: Subcategory;
  tone: Tone;
  selectedIdea: StoryIdea;
  existingConcept: string;
  onConceptGenerated: (concept: string) => void;
  onAccept: () => void;
  authorProfile?: AuthorProfile | null;
  fictionStyle?: FictionStyleSettings | null;
}

// Type for nonfiction response
interface NonfictionResponse {
  _type: "nonfiction";
  title: string;
  promise: string;
  targetReader: string;
  methodology: {
    name: string;
    description: string;
    keySteps: string[];
  };
  chapters: Array<{ number: number; title: string; summary: string }>;
  authorCredibility?: string;
  callToAction?: string;
}

// Type for fiction response
interface FictionResponse {
  _type?: "fiction";
  title?: string;
  synopsis?: string;
  protagonist?: {
    name: string;
    description?: string;
    innerConflict?: string;
    arc?: string;
  };
  antagonist?: {
    name: string;
    description?: string;
  };
  setting?: string;
  themes?: string[];
  plotPoints?: Array<{ beat: string; description: string }>;
  chapters?: Array<{ number?: number; title: string; summary: string }>;
}

export function Step5StoryDetail({
  genre,
  subcategory,
  tone,
  selectedIdea,
  existingConcept,
  onConceptGenerated,
  onAccept,
  authorProfile,
}: Step5StoryDetailProps) {
  const [concept, setConcept] = useState(existingConcept);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastIdeaId, setLastIdeaId] = useState<string | null>(null);

  // Check if this is a nonfiction book
  const isNonfiction = genre === "szakkonyv";

  // Generate on mount or when selected idea changes
  useEffect(() => {
    const currentIdeaId = selectedIdea?.title;
    
    // Ha nincs koncepció, vagy más ötletet választottak
    if (!concept || (lastIdeaId && lastIdeaId !== currentIdeaId)) {
      setConcept("");
      setLastIdeaId(currentIdeaId);
      generateConcept();
    } else if (!lastIdeaId) {
      setLastIdeaId(currentIdeaId);
    }
  }, [selectedIdea]);

  const generateConcept = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-story", {
        body: {
          storyIdea: `${selectedIdea.title}\n\n${selectedIdea.synopsis}\n\nKulcselemek: ${selectedIdea.mainElements.join(", ")}\n\nEgyedi vonás: ${selectedIdea.uniqueSellingPoint}`,
          // CRITICAL: Pass "szakkonyv" for nonfiction to trigger the correct prompt
          genre: isNonfiction ? "szakkonyv" : (genre === "fiction" ? subcategory : genre),
          tone,
          targetAudience: "general",
          // Pass author profile for nonfiction personalization
          authorProfile: isNonfiction ? authorProfile : undefined,
        },
      });

      if (error) throw error;
      
      let detailedConcept = "";
      
      // Handle response based on book type
      if (isNonfiction || data._type === "nonfiction") {
        // === NONFICTION CONCEPT FORMAT ===
        const nonfictionData = data as NonfictionResponse;
        
        if (nonfictionData.title) {
          detailedConcept += `# ${nonfictionData.title}\n\n`;
        }
        
        if (nonfictionData.promise) {
          detailedConcept += `## Nagy Ígéret\n\n${nonfictionData.promise}\n\n`;
        }
        
        if (nonfictionData.targetReader) {
          detailedConcept += `## Célközönség\n\n${nonfictionData.targetReader}\n\n`;
        }
        
        if (nonfictionData.methodology) {
          detailedConcept += `## Módszertan: ${nonfictionData.methodology.name}\n\n`;
          detailedConcept += `${nonfictionData.methodology.description}\n\n`;
          
          if (nonfictionData.methodology.keySteps?.length) {
            detailedConcept += `**Kulcs lépések:**\n\n`;
            nonfictionData.methodology.keySteps.forEach((step, i) => {
              detailedConcept += `${i + 1}. ${step}\n`;
            });
            detailedConcept += "\n";
          }
        }
        
        if (nonfictionData.chapters?.length) {
          detailedConcept += `## Fejezet Áttekintés\n\n`;
          nonfictionData.chapters.forEach((ch) => {
            detailedConcept += `**${ch.number}. ${ch.title}**\n${ch.summary}\n\n`;
          });
        }
        
        if (nonfictionData.authorCredibility) {
          detailedConcept += `## Szerzői Hitelesség\n\n${nonfictionData.authorCredibility}\n\n`;
        }
        
        if (nonfictionData.callToAction) {
          detailedConcept += `## Felhívás Cselekvésre\n\n${nonfictionData.callToAction}\n\n`;
        }
      } else {
        // === FICTION CONCEPT FORMAT ===
        const fictionData = data as FictionResponse;
        
        if (fictionData.synopsis) {
          detailedConcept += `## Szinopszis\n\n${fictionData.synopsis}\n\n`;
        }
        
        if (fictionData.protagonist) {
          detailedConcept += `## Főszereplő: ${fictionData.protagonist.name}\n`;
          if (fictionData.protagonist.description) detailedConcept += `${fictionData.protagonist.description}\n`;
          if (fictionData.protagonist.innerConflict) detailedConcept += `\n**Belső konfliktus:** ${fictionData.protagonist.innerConflict}\n`;
          if (fictionData.protagonist.arc) detailedConcept += `**Karakterív:** ${fictionData.protagonist.arc}\n`;
          detailedConcept += "\n";
        }
        
        if (fictionData.antagonist) {
          detailedConcept += `## Antagonista: ${fictionData.antagonist.name}\n${fictionData.antagonist.description}\n\n`;
        }
        
        if (fictionData.setting) {
          detailedConcept += `## Helyszín és időszak\n${fictionData.setting}\n\n`;
        }
        
        if (fictionData.themes && fictionData.themes.length > 0) {
          detailedConcept += `## Témák\n${fictionData.themes.map((t) => `- ${t}`).join("\n")}\n\n`;
        }
        
        if (fictionData.plotPoints && fictionData.plotPoints.length > 0) {
          detailedConcept += `## Cselekménypontok\n`;
          fictionData.plotPoints.forEach((point) => {
            detailedConcept += `\n### ${point.beat}\n${point.description}\n`;
          });
        }
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
          {isNonfiction ? "Könyv koncepció" : "Történet kidolgozása"}
        </h1>
        <p className="text-muted-foreground text-lg">
          {isNonfiction 
            ? "Tekintsd át és szerkeszd a szakkönyv struktúráját" 
            : "Tekintsd át és szerkeszd a részletes koncepciót"
          }
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
            <span>AI által generált {isNonfiction ? "szakkönyv koncepció" : "koncepció"}</span>
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
            placeholder={isNonfiction 
              ? "A szakkönyv koncepció itt jelenik meg..." 
              : "A részletes koncepció itt jelenik meg..."
            }
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
