import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Cloud, BookOpen, Edit3, Users, FlaskConical, Save } from "lucide-react";
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
import { useCharacters } from "@/hooks/useCharacters";
import { useSources, useCitations } from "@/hooks/useResearch";
import { useAIGeneration, AIAction, AISettings, AIContext } from "@/hooks/useAIGeneration";
import { toast } from "sonner";
import type { Block, BlockType, ProjectGenre } from "@/types/editor";
import type { Source } from "@/types/research";
import { ROLE_LABELS } from "@/types/character";

type ViewMode = "editor" | "outline" | "characters" | "research";

export default function ProjectEditor() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [chapterSidebarCollapsed, setChapterSidebarCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [showCitationPanel, setShowCitationPanel] = useState(false);
  const [isInlineGenerating, setIsInlineGenerating] = useState(false);
  const [inlineGeneratingBlockId, setInlineGeneratingBlockId] = useState<string | null>(null);
  const [globalSelectedText, setGlobalSelectedText] = useState<string>("");
  const [cursorPosition, setCursorPosition] = useState<{ blockId: string; offset: number } | null>(null);

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
    flushPendingChanges,
  } = useEditorData(projectId || "");

  // Research hooks for Szakkönyv projects
  const { sources } = useSources(projectId || "");
  const { citations, createCitation } = useCitations(activeChapterId);

  // Character hooks for fiction/erotic projects
  const { characters } = useCharacters(projectId || "");

  // Build character context for AI
  const charactersContext = useMemo(() => {
    if (!characters || characters.length === 0) return undefined;
    
    return characters.map(c => {
      const parts = [`**${c.name}** (${ROLE_LABELS[c.role] || c.role})`];
      if (c.occupation) parts.push(`foglalkozás: ${c.occupation}`);
      if (c.gender) parts.push(`nem: ${c.gender}`);
      if (c.age) parts.push(`kor: ${c.age} éves`);
      if (c.appearance_description) parts.push(`kinézet: ${c.appearance_description}`);
      if (c.backstory) parts.push(`háttér: ${c.backstory.slice(0, 300)}`);
      if (c.positive_traits?.length) parts.push(`pozitív: ${c.positive_traits.join(', ')}`);
      if (c.negative_traits?.length) parts.push(`negatív: ${c.negative_traits.join(', ')}`);
      if (c.speech_style) parts.push(`beszédstílus: ${c.speech_style}`);
      return parts.join(' | ');
    }).join('\n\n');
  }, [characters]);

  // Check if project supports characters (fiction or erotic)
  const supportsCharacters = project?.genre === "fiction" || project?.genre === "erotikus";
  // Check if project supports research (non-fiction)
  const supportsResearch = project?.genre === "szakkonyv";

  // AI generation for inline actions
  const { generate: aiGenerate, reset: aiReset } = useAIGeneration({
    projectId: projectId || "",
    chapterId: activeChapterId || undefined,
    genre: project?.genre,
  });

  // Global selection listener for AI sidebar tools
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) {
        setGlobalSelectedText(sel.toString());
        
        // Track cursor position
        if (sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const container = range.startContainer.parentElement?.closest('[data-block-id]');
          if (container) {
            const blockId = container.getAttribute('data-block-id');
            if (blockId) {
              setCursorPosition({ blockId, offset: range.startOffset });
            }
          }
        }
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  // Handle inline AI action from FloatingToolbar
  const handleInlineAIAction = useCallback(async (action: AIAction, selectedText: string, blockId: string) => {
    if (!selectedText.trim()) {
      toast.error("Válassz ki szöveget a művelethez");
      return;
    }

    setIsInlineGenerating(true);
    setInlineGeneratingBlockId(blockId);

    const context: AIContext = {
      bookDescription: project?.description || undefined,
      tone: project?.tone || undefined,
      chapterContent: blocks.map((b) => b.content).join("\n").slice(-2000),
      characters: charactersContext,
    };

    const settings: AISettings = {
      creativity: 50,
      length: "medium",
      useProjectStyle: true,
    };

    // Build action-specific prompt
    let prompt = "";
    switch (action) {
      case "rewrite":
        prompt = `Írd át ezt a szöveget jobban, megtartva az értelmét. Csak az átírt szöveget add vissza, semmi mást:\n\n"${selectedText}"`;
        break;
      case "expand":
        prompt = `Bővítsd ki ezt a szöveget részletesebb leírásokkal. Csak a bővített szöveget add vissza, semmi mást:\n\n"${selectedText}"`;
        break;
      case "shorten":
        prompt = `Tömörítsd ezt a szöveget, megtartva a lényeget. Csak a tömörített szöveget add vissza, semmi mást:\n\n"${selectedText}"`;
        break;
      default:
        prompt = selectedText;
    }

    try {
      aiReset();
      const result = await aiGenerate(action, prompt, context, settings);
      
      if (result) {
        // Find the block and replace the selected text
        const block = blocks.find((b) => b.id === blockId);
        if (block) {
          const newContent = block.content.replace(selectedText, result);
          updateBlock(blockId, { content: newContent });
          
          // Sync DOM
          setTimeout(() => {
            const blockElements = document.querySelectorAll('[contenteditable="true"]');
            for (const el of blockElements) {
              const htmlEl = el as HTMLElement;
              const parentDiv = htmlEl.closest('[class*="group relative"]');
              if (parentDiv) {
                // Find by checking content match
                if (block.content === htmlEl.innerText || htmlEl.innerText.includes(selectedText)) {
                  htmlEl.innerText = newContent;
                  break;
                }
              }
            }
          }, 0);
          
          toast.success(`${action === "rewrite" ? "Átírva" : action === "expand" ? "Bővítve" : "Rövidítve"}!`);
        }
      }
    } catch (error) {
      console.error("Inline AI action error:", error);
      toast.error("Hiba történt az AI művelet során");
    } finally {
      setIsInlineGenerating(false);
      setInlineGeneratingBlockId(null);
    }
  }, [project, blocks, updateBlock, aiGenerate, aiReset]);

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
            </TabsList>
          </Tabs>
        </div>

        {/* Content based on view mode */}
        {viewMode === "editor" ? (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[700px] px-16 py-8">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  data-block-id={block.id}
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
                    onAIAction={handleInlineAIAction}
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
              projectId={projectId}
              projectGenre={project?.genre}
              projectDescription={project?.description || undefined}
              projectTone={project?.tone || undefined}
              currentChapterId={activeChapterId || undefined}
              currentChapterTitle={chapters.find((c) => c.id === activeChapterId)?.title}
              currentChapterContent={blocks.map((b) => b.content).join("\n")}
              characterCount={characters.length}
              charactersContext={charactersContext}
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
                const block = blocks.find(b => b.id === position.blockId);
                if (block) {
                  const before = block.content.substring(0, position.offset);
                  const after = block.content.substring(position.offset);
                  const newContent = before + text + after;
                  updateBlock(position.blockId, { content: newContent });
                  
                  // Sync DOM
                  setTimeout(() => {
                    const blockEl = document.querySelector(`[data-block-id="${position.blockId}"] [contenteditable="true"]`) as HTMLElement;
                    if (blockEl) {
                      blockEl.innerText = newContent;
                    }
                  }, 0);
                }
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
