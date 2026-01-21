import { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Cloud, BookOpen, Edit3, Users, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AdultBadge } from "@/components/ui/adult-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChapterSidebar } from "@/components/editor/ChapterSidebar";
import { EditorBlock } from "@/components/editor/EditorBlock";
import { AIAssistantPanel } from "@/components/editor/AIAssistantPanel";
import { OutlineView } from "@/components/editor/OutlineView";
import { CharacterList } from "@/components/characters/CharacterList";
import { ResearchView } from "@/components/research/ResearchView";
import { CitationPanel } from "@/components/research/CitationPanel";
import { useEditorData } from "@/hooks/useEditorData";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { useSources, useCitations } from "@/hooks/useResearch";
import { toast } from "sonner";
import type { Block, BlockType, ProjectGenre } from "@/types/editor";
import type { Source } from "@/types/research";

type ViewMode = "editor" | "outline" | "characters" | "research";

export default function ProjectEditor() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [chapterSidebarCollapsed, setChapterSidebarCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(true);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [showCitationPanel, setShowCitationPanel] = useState(false);

  const { project, isLoading: projectLoading } = useProjectDetails(projectId || "");
  const {
    chapters,
    blocks,
    activeChapterId,
    setActiveChapterId,
    isLoading,
    isSaving,
    lastSaved,
    createChapter,
    updateChapter,
    deleteChapter,
    duplicateChapter,
    reorderChapters,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
  } = useEditorData(projectId || "");

  // Research hooks for Szakkönyv projects
  const { sources } = useSources(projectId || "");
  const { citations, createCitation } = useCitations(activeChapterId);

  // Check if project supports characters (fiction or erotic)
  const supportsCharacters = project?.genre === "fiction" || project?.genre === "erotikus";
  // Check if project supports research (non-fiction)
  const supportsResearch = project?.genre === "szakkonyv";

  // Handle citation insertion
  const handleInsertCitation = useCallback(async (source: Source, pageRef?: string) => {
    if (!activeChapterId) return;
    
    const citation = await createCitation(source.id, selectedBlockId || undefined, pageRef);
    if (citation) {
      // Insert citation marker into the text
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const marker = document.createTextNode(`[${citation.citation_number}]`);
        range.insertNode(marker);
        range.setStartAfter(marker);
        range.setEndAfter(marker);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      toast.success(`Hivatkozás beszúrva [${citation.citation_number}]`);
    }
  }, [activeChapterId, selectedBlockId, createCitation]);

  const handleCreateBlockAfter = useCallback(async (afterBlockId: string, type: BlockType = "paragraph") => {
    const afterBlock = blocks.find((b) => b.id === afterBlockId);
    if (!afterBlock) return;

    const sortOrder = afterBlock.sort_order + 0.5;
    const newBlock = await createBlock(type, "", sortOrder);
    
    if (newBlock) {
      // Reorder to fix fractional sort orders
      const newBlocks = [...blocks, newBlock].sort((a, b) => a.sort_order - b.sort_order);
      const reordered = newBlocks.map((b, i) => ({ ...b, sort_order: i }));
      await reorderBlocks(reordered);
      setSelectedBlockId(newBlock.id);
    }
  }, [blocks, createBlock, reorderBlocks]);

  const handleDeleteBlock = useCallback(async (blockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    await deleteBlock(blockId);
    
    // Select previous block or create new one if empty
    if (blocks.length <= 1) {
      const newBlock = await createBlock("paragraph", "", 0);
      if (newBlock) setSelectedBlockId(newBlock.id);
    } else {
      const prevBlock = blocks[blockIndex - 1] || blocks[blockIndex + 1];
      if (prevBlock) setSelectedBlockId(prevBlock.id);
    }
  }, [blocks, deleteBlock, createBlock]);

  const handleDrop = useCallback((targetBlockId: string) => {
    if (!draggedBlockId || draggedBlockId === targetBlockId) return;

    const draggedIndex = blocks.findIndex((b) => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex((b) => b.id === targetBlockId);

    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, removed);

    const reordered = newBlocks.map((b, i) => ({ ...b, sort_order: i }));
    reorderBlocks(reordered);
    setDraggedBlockId(null);
  }, [blocks, draggedBlockId, reorderBlocks]);

  const handleGenerateOutline = async (description: string) => {
    if (!description) {
      toast.error("A vázlat generáláshoz add meg a könyv leírását");
      return;
    }

    setIsGeneratingOutline(true);
    
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const genre = project?.genre as ProjectGenre;
    const suggestedChapters = genre === "szakkonyv" 
      ? ["Bevezetés", "Alapfogalmak", "Részletes elemzés", "Gyakorlati alkalmazás", "Összefoglalás"]
      : genre === "fiction"
      ? ["Prológus", "Első találkozás", "Konfliktus kibontakozása", "Tetőpont", "Megoldás", "Epilógus"]
      : ["Bevezető hangulat", "Ismerkedés", "Feszültség építése", "Csúcspont", "Érzelmi lezárás"];

    for (const title of suggestedChapters) {
      await createChapter(title);
    }

    setIsGeneratingOutline(false);
    toast.success("Vázlat generálva!");
  };

  const handleSelectChapterFromOutline = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setViewMode("editor");
  };

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    if (diff < 60000) return "Most mentve";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} perce mentve`;
    return lastSaved.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
  };

  if (!projectId) {
    navigate("/dashboard");
    return null;
  }

  if (isLoading || projectLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdultContent = project?.genre === "erotikus";

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Chapter Sidebar - only in editor mode */}
      {viewMode === "editor" && (
        <ChapterSidebar
          chapters={chapters}
          activeChapterId={activeChapterId}
          onSelectChapter={setActiveChapterId}
          onCreateChapter={createChapter}
          onUpdateChapter={updateChapter}
          onDeleteChapter={deleteChapter}
          onDuplicateChapter={duplicateChapter}
          onReorderChapters={reorderChapters}
          isCollapsed={chapterSidebarCollapsed}
          onToggleCollapse={() => setChapterSidebarCollapsed(!chapterSidebarCollapsed)}
        />
      )}

      {/* Main Editor Area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">
                  {project?.title || "Projekt"}
                </h1>
                {isAdultContent && <AdultBadge size="sm" />}
              </div>
              {viewMode === "editor" && (
                <p className="text-sm text-muted-foreground">
                  {chapters.find((c) => c.id === activeChapterId)?.title}
                </p>
              )}
            </div>
          </div>

          {/* View mode toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="editor" className="gap-2">
                <Edit3 className="h-4 w-4" />
                Szerkesztő
              </TabsTrigger>
              <TabsTrigger value="outline" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Vázlat
              </TabsTrigger>
              {supportsCharacters && (
                <TabsTrigger value="characters" className="gap-2">
                  <Users className="h-4 w-4" />
                  Karakterek
                </TabsTrigger>
              )}
              {supportsResearch && (
                <TabsTrigger value="research" className="gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Kutatás
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mentés...</span>
              </>
            ) : lastSaved ? (
              <>
                <Cloud className="h-4 w-4 text-success" />
                <span>{formatLastSaved()}</span>
              </>
            ) : null}
          </div>
        </header>

        {/* Content based on view mode */}
        {viewMode === "editor" ? (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[700px] px-16 py-8">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("border-t-2", "border-primary");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("border-t-2", "border-primary");
                  }}
                  onDrop={(e) => {
                    e.currentTarget.classList.remove("border-t-2", "border-primary");
                    handleDrop(block.id);
                  }}
                >
                  <EditorBlock
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => setSelectedBlockId(block.id)}
                    onUpdate={(updates) => updateBlock(block.id, updates)}
                    onDelete={() => handleDeleteBlock(block.id)}
                    onCreateAfter={(type) => handleCreateBlockAfter(block.id, type)}
                    onDragStart={() => setDraggedBlockId(block.id)}
                    onDragEnd={() => setDraggedBlockId(null)}
                    isDragging={draggedBlockId === block.id}
                    showResearchTools={supportsResearch}
                    onInsertCitation={() => setShowCitationPanel(true)}
                  />
                </div>
              ))}

              {/* Empty area click to add block */}
              <div
                className="h-32 cursor-text"
                onClick={() => {
                  if (blocks.length === 0) {
                    createBlock("paragraph", "", 0);
                  }
                }}
              />
            </div>
          </div>
        ) : viewMode === "outline" ? (
          <OutlineView
            chapters={chapters}
            projectGenre={project?.genre as ProjectGenre}
            projectDescription={project?.description}
            onUpdateChapter={updateChapter}
            onSelectChapter={handleSelectChapterFromOutline}
            onCreateChapter={createChapter}
            onGenerateOutline={handleGenerateOutline}
            isGenerating={isGeneratingOutline}
          />
        ) : viewMode === "characters" ? (
          <CharacterList projectId={projectId} />
        ) : viewMode === "research" ? (
          <ResearchView projectId={projectId} />
        ) : null}
      </main>

      {/* AI Assistant Panel - only in editor mode */}
      {viewMode === "editor" && (
        <AIAssistantPanel
          isCollapsed={aiPanelCollapsed}
          onToggleCollapse={() => setAiPanelCollapsed(!aiPanelCollapsed)}
          projectGenre={project?.genre}
        />
      )}

      {/* Citation Panel for research projects */}
      {supportsResearch && (
        <CitationPanel
          isOpen={showCitationPanel}
          onClose={() => setShowCitationPanel(false)}
          sources={sources}
          onSelectSource={handleInsertCitation}
        />
      )}
    </div>
  );
}
