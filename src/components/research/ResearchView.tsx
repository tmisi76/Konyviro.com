import { useState } from "react";
import { BookOpen, FileText, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SourcesList } from "./SourcesList";
import { BibliographyGenerator } from "./BibliographyGenerator";
import { RawSourcesList } from "./RawSourcesList";
import { useSources } from "@/hooks/useResearch";

interface ResearchViewProps {
  projectId: string;
}

export function ResearchView({ projectId }: ResearchViewProps) {
  const [activeTab, setActiveTab] = useState<"raw" | "sources" | "bibliography">("raw");
  const { sources } = useSources(projectId);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex h-full flex-col"
      >
        <div className="border-b border-border px-6 pt-4">
          <TabsList>
            <TabsTrigger value="raw" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Forrásanyagok
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Források
            </TabsTrigger>
            <TabsTrigger value="bibliography" className="gap-2">
              <FileText className="h-4 w-4" />
              Irodalomjegyzék
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="raw" className="flex-1 overflow-hidden mt-0">
          <RawSourcesList projectId={projectId} />
        </TabsContent>

        <TabsContent value="sources" className="flex-1 overflow-hidden mt-0">
          <SourcesList projectId={projectId} />
        </TabsContent>

        <TabsContent value="bibliography" className="flex-1 overflow-y-auto mt-0">
          <BibliographyGenerator sources={sources} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
