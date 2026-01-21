import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, ChevronDown, ChevronRight, BookOpen, User, Target, Map, List, RefreshCw, ArrowRight, ArrowLeft } from "lucide-react";
import { useStoryGeneration } from "@/hooks/useStoryGeneration";
import type { GeneratedStory } from "@/types/story";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StepStoryIdeaProps {
  storyIdea: string;
  onStoryIdeaChange: (idea: string) => void;
  generatedStory: GeneratedStory | null;
  onStoryGenerated: (story: GeneratedStory) => void;
  genre: string;
  tone?: string;
  targetAudience?: string;
  onNext: () => void;
  onBack: () => void;
}

const EXAMPLE_IDEAS = [
  "Egy fiatal nő felfedezi, hogy az apja titkos kém volt, és most őt is üldözik a múlt árnyai.",
  "Két idegen egy vonaton találkozik, és egy éjszaka alatt megváltoztatják egymás életét.",
  "Egy kis falu lakói ráébrednek, hogy a legendás erdei szörny valójában létezik.",
];

export function StepStoryIdea({
  storyIdea,
  onStoryIdeaChange,
  generatedStory,
  onStoryGenerated,
  genre,
  tone,
  targetAudience,
  onNext,
  onBack,
}: StepStoryIdeaProps) {
  const { isGenerating, generate, reset } = useStoryGeneration({ genre, tone, targetAudience });
  const [expandedSections, setExpandedSections] = useState<string[]>(["synopsis"]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleGenerate = async () => {
    const story = await generate(storyIdea);
    if (story) {
      onStoryGenerated(story);
    }
  };

  const handleRegenerate = () => {
    reset();
    handleGenerate();
  };

  const handleUseExample = (example: string) => {
    onStoryIdeaChange(example);
  };

  if (generatedStory) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 bg-success/10 text-success px-3 py-1.5 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Sztori elkészült!
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-lg">{generatedStory.title}</h3>
          <p className="text-sm text-muted-foreground italic">"{generatedStory.logline}"</p>
        </div>

        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-2">
            {/* Synopsis */}
            <Collapsible open={expandedSections.includes("synopsis")} onOpenChange={() => toggleSection("synopsis")}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Szinopszis
                  </span>
                  {expandedSections.includes("synopsis") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{generatedStory.synopsis}</p>
              </CollapsibleContent>
            </Collapsible>

            {/* Protagonist */}
            <Collapsible open={expandedSections.includes("protagonist")} onOpenChange={() => toggleSection("protagonist")}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Főszereplő: {generatedStory.protagonist.name}
                  </span>
                  {expandedSections.includes("protagonist") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3 space-y-2">
                <p className="text-sm text-muted-foreground">{generatedStory.protagonist.description}</p>
                <div className="text-sm">
                  <span className="font-medium">Belső konfliktus:</span>
                  <span className="text-muted-foreground ml-1">{generatedStory.protagonist.innerConflict}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Karakterív:</span>
                  <span className="text-muted-foreground ml-1">{generatedStory.protagonist.arc}</span>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Antagonist */}
            {generatedStory.antagonist && (
              <Collapsible open={expandedSections.includes("antagonist")} onOpenChange={() => toggleSection("antagonist")}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Ellenfél: {generatedStory.antagonist.name}
                    </span>
                    {expandedSections.includes("antagonist") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3">
                  <p className="text-sm text-muted-foreground">{generatedStory.antagonist.description}</p>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Setting */}
            <Collapsible open={expandedSections.includes("setting")} onOpenChange={() => toggleSection("setting")}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <span className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    Helyszín és idő
                  </span>
                  {expandedSections.includes("setting") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <p className="text-sm text-muted-foreground">{generatedStory.setting}</p>
              </CollapsibleContent>
            </Collapsible>

            {/* Plot Points */}
            <Collapsible open={expandedSections.includes("plotPoints")} onOpenChange={() => toggleSection("plotPoints")}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Fordulópontok ({generatedStory.plotPoints.length})
                  </span>
                  {expandedSections.includes("plotPoints") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <div className="space-y-2">
                  {generatedStory.plotPoints.map((point, index) => (
                    <div key={index} className="border-l-2 border-primary/30 pl-3">
                      <p className="text-sm font-medium">{point.beat}</p>
                      <p className="text-xs text-muted-foreground">{point.description}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Chapters */}
            <Collapsible open={expandedSections.includes("chapters")} onOpenChange={() => toggleSection("chapters")}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <span className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Fejezetek ({generatedStory.chapters.length})
                  </span>
                  {expandedSections.includes("chapters") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <div className="space-y-2">
                  {generatedStory.chapters.map((chapter) => (
                    <div key={chapter.number} className="bg-background rounded p-2">
                      <p className="text-sm font-medium">{chapter.number}. {chapter.title}</p>
                      <p className="text-xs text-muted-foreground">{chapter.summary}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vissza
          </Button>
          <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
            Újra
          </Button>
          <Button onClick={onNext} className="flex-1">
            Tovább
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold">Mi a könyved alapötlete?</h3>
        <p className="text-sm text-muted-foreground">
          Írd le röviden a történeted magját, és az AI kidolgozza a részleteket
        </p>
      </div>

      <Textarea
        value={storyIdea}
        onChange={(e) => onStoryIdeaChange(e.target.value)}
        placeholder="Pl: Egy fiatal nő felfedezi, hogy az apja titkos kém volt..."
        className="min-h-[120px] resize-none"
        disabled={isGenerating}
      />

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">💡 Példák inspirációnak:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_IDEAS.map((idea, index) => (
            <button
              key={index}
              onClick={() => handleUseExample(idea)}
              className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded-md text-left transition-colors"
              disabled={isGenerating}
            >
              {idea.substring(0, 50)}...
            </button>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        <p className="text-sm font-medium">🎯 Tippek a jobb eredményért:</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          <li>• Ki a főszereplő és mi a célja?</li>
          <li>• Mi a fő konfliktus vagy akadály?</li>
          <li>• Milyen világban/korban játszódik?</li>
          <li>• Mi a hangulat (sötét, romantikus, kalandos)?</li>
        </ul>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Vissza
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || storyIdea.trim().length < 10}
          className="flex-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generálás...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Sztori Generálása
            </>
          )}
        </Button>
      </div>

      {isGenerating && (
        <div className="text-center text-sm text-muted-foreground animate-pulse">
          🎭 Bestseller minőségű sztori készítése folyamatban...
        </div>
      )}
    </div>
  );
}
