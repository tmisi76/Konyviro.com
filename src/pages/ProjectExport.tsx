import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { FormatCard } from "@/components/export/FormatCard";
import { ExportSettingsPanel } from "@/components/export/ExportSettingsPanel";
import { AdditionalExports } from "@/components/export/AdditionalExports";
import { CoverGenerator } from "@/components/export/CoverGenerator";
import { BookPreview } from "@/components/export/BookPreview";

import {
  exportBook,
  exportCharacterList,
  exportBibliography,
} from "@/lib/exportUtils";

import {
  DEFAULT_EXPORT_SETTINGS,
  type ExportSettings,
} from "@/types/export";

type LegacyExportFormat = "docx" | "pdf" | "epub" | "txt";

// Legacy format cards for this page (supports txt, not mobi)
const LEGACY_EXPORT_FORMATS = [
  {
    id: "epub" as const,
    name: "ePub",
    description: "E-könyv olvasókhoz (Kobo, Apple Books)",
    icon: "📱",
    recommended: true,
  },
  {
    id: "pdf" as const,
    name: "PDF",
    description: "Nyomtatásra kész, fix elrendezés",
    icon: "📄",
  },
  {
    id: "docx" as const,
    name: "Word",
    description: "Szerkeszthető dokumentum",
    icon: "📝",
  },
  {
    id: "txt" as const,
    name: "Szöveges",
    description: "Egyszerű szöveges fájl",
    icon: "📄",
  },
];
import type { Chapter, Block } from "@/types/editor";
import type { Character } from "@/types/character";
import type { Source } from "@/types/research";

import { saveAs } from "file-saver";

export default function ProjectExport() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [project, setProject] = useState<{
    title: string;
    genre: string;
    description?: string;
  } | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterContents, setChapterContents] = useState<Record<string, string>>({});
  const [characters, setCharacters] = useState<Character[]>([]);
  const [sources, setSources] = useState<Source[]>([]);

  const [selectedFormat, setSelectedFormat] = useState<LegacyExportFormat>("docx");
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);

  // Fetch project data
  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      setIsLoading(true);

      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        if (projectError) throw projectError;
        setProject({
          title: projectData.title,
          genre: projectData.genre,
          description: projectData.description || undefined,
        });

        // Fetch chapters
        const { data: chaptersData, error: chaptersError } = await supabase
          .from("chapters")
          .select("*")
          .eq("project_id", projectId)
          .order("sort_order");

        if (chaptersError) throw chaptersError;
        
        const typedChapters = (chaptersData || []).map((c) => ({
          ...c,
          status: c.status as Chapter["status"],
          key_points: (c.key_points || []) as string[],
        }));
        setChapters(typedChapters);

        // Fetch blocks for each chapter
        const contents: Record<string, string> = {};
        for (const chapter of typedChapters) {
          const { data: blocksData } = await supabase
            .from("blocks")
            .select("*")
            .eq("chapter_id", chapter.id)
            .order("sort_order");

          contents[chapter.id] = (blocksData || [])
            .map((b) => b.content)
            .join("\n\n");
        }
        setChapterContents(contents);

        // Fetch characters (for fiction)
        if (projectData.genre === "fiction" || projectData.genre === "erotikus") {
          const { data: charsData } = await supabase
            .from("characters")
            .select("*")
            .eq("project_id", projectId);

          if (charsData) {
            const typedChars = charsData.map((c) => ({
              ...c,
              role: c.role as Character["role"],
              motivations: (c.motivations || []) as string[],
              fears: (c.fears || []) as string[],
              positive_traits: (c.positive_traits || []) as string[],
              negative_traits: (c.negative_traits || []) as string[],
              key_events: (Array.isArray(c.key_events) ? c.key_events : []) as unknown as Character["key_events"],
            }));
            setCharacters(typedChars);
          }
        }

        // Fetch sources (for non-fiction)
        if (projectData.genre === "szakkonyv") {
          const { data: sourcesData } = await supabase
            .from("sources")
            .select("*")
            .eq("project_id", projectId);

          if (sourcesData) {
            const typedSources = sourcesData.map((s) => ({
              ...s,
              source_type: s.source_type as Source["source_type"],
              tags: (s.tags || []) as string[],
            }));
            setSources(typedSources);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Hiba az adatok betöltésekor");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleExport = async () => {
    if (!project) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await exportBook(selectedFormat, {
        projectTitle: project.title,
        chapters,
        chapterContents,
        settings,
        characters,
        sources,
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      toast.success("Exportálás sikeres!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Hiba az exportálás során");
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 500);
    }
  };

  const handleGenerateTOC = async () => {
    toast.success("Tartalomjegyzék generálva!");
  };

  const handleGenerateBibliography = async () => {
    if (!project || sources.length === 0) {
      toast.error("Nincsenek források a bibliográfiához");
      return;
    }

    const blob = await exportBibliography(sources, project.title, "apa");
    saveAs(blob, `${project.title}_bibliografia.txt`);
    toast.success("Bibliográfia exportálva!");
  };

  const handleExportCharacters = async () => {
    if (!project || characters.length === 0) {
      toast.error("Nincsenek karakterek az exportáláshoz");
      return;
    }

    const blob = await exportCharacterList(characters, project.title);
    saveAs(blob, `${project.title}_karakterek.txt`);
    toast.success("Karakterek exportálva!");
  };

  const handleShare = () => {
    toast.info("Megosztási link generálása hamarosan elérhető!");
  };

  if (!projectId) {
    navigate("/dashboard");
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Preview */}
      <div className="flex flex-1 flex-col border-r border-border">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/project/${projectId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Exportálás</h1>
            <p className="text-sm text-muted-foreground">{project?.title}</p>
          </div>
        </header>

        <div className="flex-1 p-4">
          <BookPreview
            projectTitle={project?.title || ""}
            chapters={chapters}
            chapterContents={chapterContents}
            settings={settings}
          />
        </div>
      </div>

      {/* Right Panel - Options */}
      <div className="w-[400px] flex flex-col">
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {/* Format Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Formátum</h3>
              <div className="grid grid-cols-2 gap-3">
                {LEGACY_EXPORT_FORMATS.map((format) => (
                  <FormatCard
                    key={format.id}
                    format={format}
                    isSelected={selectedFormat === format.id}
                    onSelect={() => setSelectedFormat(format.id)}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Export Settings */}
            <ExportSettingsPanel
              settings={settings}
              onSettingsChange={setSettings}
              selectedFormat={selectedFormat}
            />

            <Separator />

            {/* Additional Exports */}
            <AdditionalExports
              projectGenre={project?.genre || "fiction"}
              onGenerateTOC={handleGenerateTOC}
              onGenerateBibliography={handleGenerateBibliography}
              onExportCharacters={handleExportCharacters}
              isLoading={isExporting}
            />

            <Separator />

            {/* Cover Generator */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Borító</h3>
              <CoverGenerator projectTitle={project?.title || ""} />
            </div>
          </div>
        </ScrollArea>

        {/* Export Button */}
        <div className="border-t border-border p-4 space-y-3">
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Exportálás...</span>
                <span className="text-foreground">{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : exportProgress === 100 ? (
                <Check className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? "Exportálás..." : "Exportálás"}
            </Button>

            {selectedFormat === "pdf" && (
              <Button
                variant="outline"
                onClick={handleShare}
                disabled={isExporting}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Megosztás
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
