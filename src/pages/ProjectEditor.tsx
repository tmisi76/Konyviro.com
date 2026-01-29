import { useCallback, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Cloud, BookOpen, Edit3, Users, FlaskConical, Save, ImageIcon, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AdultBadge } from "@/components/ui/adult-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChapterSidebar } from "@/components/editor/ChapterSidebar";
import { EditorView } from "@/components/editor/EditorView";
import { AIAssistantPanel } from "@/components/editor/AIAssistantPanel";
import { OutlineView } from "@/components/editor/OutlineView";
import { CharacterList } from "@/components/characters/CharacterList";
import { ResearchView } from "@/components/research/ResearchView";
import { CitationPanel } from "@/components/research/CitationPanel";
import { useEditorData } from "@/hooks/useEditorData";
import { useEditorState, ViewMode } from "@/hooks/useEditorState";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { useCharacters } from "@/hooks/useCharacters";
import { useAIContext } from "@/hooks/useAIContext";
import { useSources, useCitations } from "@/hooks/useResearch";
import { useInlineAI } from "@/hooks/useInlineAI";
import { AIAction } from "@/hooks/useAIGeneration";
import { toast } from "sonner";
import type { Block, BlockType, ProjectGenre } from "@/types/editor";
import type { Source } from "@/types/research";
import { AudiobookTab } from "@/components/audiobook/AudiobookTab";

export default function ProjectEditor() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // UI state from custom hook
  const {
    viewMode,
    setViewMode,
    chapterSidebarCollapsed,
    setChapterSidebarCollapsed,
    aiPanelCollapsed,
    setAiPanelCollapsed,
    selectedBlockId,
    setSelectedBlockId,
    draggedBlockId,
    setDraggedBlockId,
    isGeneratingOutline,
    setIsGeneratingOutline,
    showCitationPanel,
    setShowCitationPanel,
    globalSelectedText,
    setGlobalSelectedText,
    cursorPosition,
    setCursorPosition,
  } = useEditorState();

  const { project, isLoading: projectLoading } = useProjectDetails(projectId || "");
  const {
    chapters,
    blocks,
    activeChapterId,
    setActiveChapterId,
    isLoading,
    isLoadingBlocks,
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
    flushPendingChanges,
  } = useEditorData(projectId || "");

  // Research hooks for Szakkönyv projects
  const { sources } = useSources(projectId || "");
  const { citations, createCitation } = useCitations(activeChapterId);

  // Character hooks for fiction/erotic projects
  const { characters } = useCharacters(projectId || "");

  // AI context for character and narrative consistency
  const { charactersContext, previousChaptersSummaries } = useAIContext({
    characters,
    chapters,
    activeChapterId,
  });

  // Check if project supports characters (fiction or erotic)
  const supportsCharacters = project?.genre === "fiction" || project?.genre === "erotikus";
  // Check if project supports research (non-fiction)
  const supportsResearch = project?.genre === "szakkonyv";

  // Inline AI actions (rewrite, expand, shorten)
  const { handleInlineAIAction } = useInlineAI({
    projectId: projectId || "",
    activeChapterId,
    projectGenre: project?.genre,
    projectDescription: project?.description || undefined,
    projectTone: project?.tone || undefined,
    blocks,
    charactersContext,
    updateBlock,
  });

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
      
      // Fókuszálás az új blokkra
      setTimeout(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"] [contenteditable]`);
        if (newBlockElement instanceof HTMLElement) {
          newBlockElement.focus();
        }
      }, 50);
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
    if (diff < 10000) return "Most mentve";
    if (diff < 60000) return `${Math.floor(diff / 1000)} mp-e mentve`;
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
    <div className="flex h-screen w-full flex-col bg-background">
      {/* Top Navigation Bar - Full Width */}
      <div className="flex w-full items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Vissza
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => flushPendingChanges()}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Mentés
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              await flushPendingChanges();
              navigate("/dashboard");
            }}
          >
            Mentés és bezár
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
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

        {/* Header Row 1: Title */}
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">
              {project?.title || "Projekt"}
            </h1>
            {isAdultContent && <AdultBadge size="sm" />}
          </div>
        </div>

        {/* Header Row 2: Tabs */}
        <div className="border-b border-border bg-card px-4 py-2 flex justify-center">
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
              <TabsTrigger value="audiobook" className="gap-2">
                <Headphones className="h-4 w-4" />
                Hangoskönyv
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Cover Designer Link */}
          <Button
            variant="outline"
            size="sm"
            className="ml-4 gap-2"
            onClick={() => navigate(`/project/${projectId}/cover`)}
          >
            <ImageIcon className="h-4 w-4" />
            Borító Tervező
          </Button>
        </div>

        {/* Content based on view mode */}
        {viewMode === "editor" ? (
          <EditorView
            isLoading={isLoadingBlocks}
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            draggedBlockId={draggedBlockId}
            supportsResearch={supportsResearch}
            onSelectBlock={setSelectedBlockId}
            onUpdateBlock={updateBlock}
            onDeleteBlock={handleDeleteBlock}
            onCreateBlockAfter={handleCreateBlockAfter}
            onDragStart={setDraggedBlockId}
            onDragEnd={() => setDraggedBlockId(null)}
            onDrop={handleDrop}
            onInsertCitation={() => setShowCitationPanel(true)}
            onAIAction={handleInlineAIAction}
            onCreateEmptyBlock={() => createBlock("paragraph", "", 0)}
          />
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
        ) : viewMode === "audiobook" ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <AudiobookTab 
                projectId={projectId} 
                sampleText={blocks.slice(0, 3).map(b => b.content).join(" ").slice(0, 200)}
              />
            </div>
          </div>
        ) : null}
          </main>

          {/* AI Assistant Panel - only in editor mode */}
          {viewMode === "editor" && (
            <AIAssistantPanel
              isCollapsed={aiPanelCollapsed}
              onToggleCollapse={() => setAiPanelCollapsed(!aiPanelCollapsed)}
              projectId={projectId}
              projectGenre={project?.genre}
              projectDescription={project?.description || undefined}
              projectTone={project?.tone || undefined}
              currentChapterId={activeChapterId || undefined}
              currentChapterTitle={chapters.find((c) => c.id === activeChapterId)?.title}
              currentChapterContent={blocks.map((b) => b.content).join("\n")}
              characterCount={characters.length}
              charactersContext={charactersContext}
              previousChaptersSummaries={previousChaptersSummaries}
              selectedText={globalSelectedText}
              cursorPosition={cursorPosition}
              onInsertText={(text) => {
                // Insert at the end of the last block or create new block
                if (blocks.length > 0) {
                  const lastBlock = blocks[blocks.length - 1];
                  const newContent = lastBlock.content ? lastBlock.content + "\n\n" + text : text;
                  updateBlock(lastBlock.id, { content: newContent });
                  
                  // Sync the DOM directly since contentEditable doesn't react to state
                  setTimeout(() => {
                    const blockElements = document.querySelectorAll('[contenteditable="true"]');
                    const lastElement = blockElements[blockElements.length - 1] as HTMLElement;
                    if (lastElement) {
                      lastElement.innerText = newContent;
                      // Move cursor to end
                      const range = document.createRange();
                      const sel = window.getSelection();
                      range.selectNodeContents(lastElement);
                      range.collapse(false);
                      sel?.removeAllRanges();
                      sel?.addRange(range);
                      lastElement.focus();
                    }
                  }, 0);
                } else {
                  createBlock("paragraph", text, 0);
                }
              }}
              onInsertTextAtCursor={(text, position) => {
                // Check if block still exists
                const block = blocks.find(b => b.id === position.blockId);
                if (!block) {
                  // Fallback: append to last block
                  if (blocks.length > 0) {
                    const lastBlock = blocks[blocks.length - 1];
                    const newContent = lastBlock.content ? lastBlock.content + "\n\n" + text : text;
                    updateBlock(lastBlock.id, { content: newContent });
                    
                    requestAnimationFrame(() => {
                      const blockEl = document.querySelector(`[data-block-id="${lastBlock.id}"] [contenteditable="true"]`) as HTMLElement;
                      if (blockEl) {
                        blockEl.innerText = newContent;
                        blockEl.focus();
                      }
                    });
                  }
                  return;
                }
                
                // Get the actual DOM element and its current content
                const blockEl = document.querySelector(
                  `[data-block-id="${position.blockId}"] [contenteditable="true"]`
                ) as HTMLElement;
                
                if (!blockEl) {
                  // Fallback: use state content
                  const newContent = block.content ? block.content + "\n\n" + text : text;
                  updateBlock(position.blockId, { content: newContent });
                  return;
                }
                
                // Use DOM content for accuracy (it may differ from React state)
                const currentContent = blockEl.innerText || "";
                const safeOffset = Math.min(position.offset, currentContent.length);
                
                const before = currentContent.substring(0, safeOffset);
                const after = currentContent.substring(safeOffset);
                const newContent = before + text + after;
                
                // Update React state
                updateBlock(position.blockId, { content: newContent });
                
                // Sync DOM and restore cursor position
                requestAnimationFrame(() => {
                  blockEl.innerText = newContent;
                  
                  // Position cursor at the end of inserted text
                  const range = document.createRange();
                  const sel = window.getSelection();
                  
                  if (blockEl.firstChild) {
                    const insertEnd = safeOffset + text.length;
                    try {
                      range.setStart(blockEl.firstChild, Math.min(insertEnd, newContent.length));
                      range.collapse(true);
                      sel?.removeAllRanges();
                      sel?.addRange(range);
                    } catch (e) {
                      // If positioning fails, just focus the element
                      console.warn("Cursor positioning failed:", e);
                    }
                  }
                  
                  blockEl.focus();
                });
              }}
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
    </div>
  );
}
