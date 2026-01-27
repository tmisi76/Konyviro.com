import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FlipBook } from "@/components/storybook/FlipBook";
import { StorybookExport } from "@/components/storybook/StorybookExport";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StorybookPage, StorybookData } from "@/types/storybook";
import { toast } from "sonner";

export default function StorybookViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [storybookData, setStorybookData] = useState<StorybookData | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const fetchStorybook = async () => {
      if (!id) {
        navigate("/dashboard");
        return;
      }

      try {
        const { data: project, error } = await supabase
          .from("projects")
          .select("id, title, storybook_data, genre, writing_status")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;

        if (!project) {
          toast.error("Mesekönyv nem található");
          navigate("/dashboard");
          return;
        }

        // Verify it's a storybook
        if (project.genre !== "mesekonyv") {
          navigate(`/project/${id}`);
          return;
        }

        setProjectTitle(project.title);

        // Parse storybook data
        if (project.storybook_data) {
          const parsed = typeof project.storybook_data === "string"
            ? JSON.parse(project.storybook_data)
            : project.storybook_data;
          setStorybookData(parsed);
        } else {
          toast.error("Mesekönyv adatok nem találhatók");
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching storybook:", error);
        toast.error("Hiba a mesekönyv betöltése során");
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStorybook();
  }, [id, navigate]);

  if (isLoading) {
    return <FullPageLoader message="Mesekönyv betöltése..." />;
  }

  if (!storybookData || !storybookData.pages?.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Nem található mesekönyv tartalom.</p>
          <Button onClick={() => navigate("/dashboard")}>
            Vissza az irányítópultra
          </Button>
        </div>
      </div>
    );
  }

  // Create a complete StorybookData object for export
  const exportData: StorybookData = {
    title: projectTitle,
    theme: storybookData.theme || null,
    ageGroup: storybookData.ageGroup || null,
    illustrationStyle: storybookData.illustrationStyle || null,
    characters: storybookData.characters || [],
    storyPrompt: storybookData.storyPrompt || "",
    pages: storybookData.pages,
    projectId: id || null,
    coverUrl: storybookData.coverUrl,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Vissza</span>
            </Button>
            <h1 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-md">
              {projectTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportálás</span>
            </Button>
          </div>
        </div>
      </header>

      {/* FlipBook viewer */}
      <main className="py-8 px-4">
        <FlipBook
          pages={storybookData.pages}
          title={projectTitle}
          className="mb-8"
        />
      </main>

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mesekönyv exportálása</DialogTitle>
          </DialogHeader>
          {id && (
            <StorybookExport
              data={exportData}
              projectId={id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
