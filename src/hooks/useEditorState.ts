import { useState } from "react";

export type ViewMode = "editor" | "outline" | "characters" | "research" | "audiobook" | "proofreading";

export interface CursorPosition {
  blockId: string;
  offset: number;
}

export function useEditorState() {
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
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(null);

  return {
    // View mode
    viewMode,
    setViewMode,
    
    // Sidebar states
    chapterSidebarCollapsed,
    setChapterSidebarCollapsed,
    aiPanelCollapsed,
    setAiPanelCollapsed,
    
    // Block selection/drag states
    selectedBlockId,
    setSelectedBlockId,
    draggedBlockId,
    setDraggedBlockId,
    
    // Generation states
    isGeneratingOutline,
    setIsGeneratingOutline,
    isInlineGenerating,
    setIsInlineGenerating,
    inlineGeneratingBlockId,
    setInlineGeneratingBlockId,
    
    // Research/Citation panel
    showCitationPanel,
    setShowCitationPanel,
    
    // Text selection & cursor
    globalSelectedText,
    setGlobalSelectedText,
    cursorPosition,
    setCursorPosition,
  };
}
