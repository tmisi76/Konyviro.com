import { useRef, useEffect, useState, KeyboardEvent, forwardRef } from "react";
import { GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Block, BlockType } from "@/types/editor";
import type { AIAction } from "@/hooks/useAIGeneration";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { FloatingToolbar } from "./FloatingToolbar";

interface EditorBlockProps {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
  onCreateAfter: (type?: BlockType) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  showResearchTools?: boolean;
  onInsertCitation?: () => void;
  onAIAction?: (action: AIAction, selectedText: string, blockId: string) => void;
}

export const EditorBlock = forwardRef<HTMLDivElement, EditorBlockProps>(
  function EditorBlock(
    {
      block,
      isSelected,
      onSelect,
      onUpdate,
      onDelete,
      onCreateAfter,
      onDragStart,
      onDragEnd,
      isDragging,
      showResearchTools = false,
      onInsertCitation,
      onAIAction,
    },
    ref
  ) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
    const [showToolbar, setShowToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

    // Handle content changes
    const handleInput = () => {
      if (!contentRef.current) return;
      const text = contentRef.current.innerText;

      // Check for slash command
      if (text === "/") {
        const rect = contentRef.current.getBoundingClientRect();
        setSlashMenuPosition({ x: rect.left, y: rect.bottom + 4 });
        setShowSlashMenu(true);
      } else {
        setShowSlashMenu(false);
      }

      // Check for markdown shortcuts
      const converted = checkMarkdownShortcuts(text);
      if (converted) {
        onUpdate({ type: converted.type, content: converted.content });
        contentRef.current.innerText = converted.content;
      } else {
        onUpdate({ content: text });
      }
    };

    // Check for markdown shortcuts
    const checkMarkdownShortcuts = (
      text: string
    ): { type: BlockType; content: string } | null => {
      if (text.startsWith("# ")) return { type: "heading1", content: text.slice(2) };
      if (text.startsWith("## ")) return { type: "heading2", content: text.slice(3) };
      if (text.startsWith("### ")) return { type: "heading3", content: text.slice(4) };
      if (text.startsWith("- ") || text.startsWith("* "))
        return { type: "bulletList", content: text.slice(2) };
      if (text.match(/^1\.\s/)) return { type: "numberedList", content: text.slice(3) };
      if (text.startsWith("> ")) return { type: "quote", content: text.slice(2) };
      return null;
    };

    // Handle keyboard events
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      // Enter key handling
      if (e.key === "Enter") {
        // Ctrl/Cmd+Enter: create new block below
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          setShowSlashMenu(false);
          onCreateAfter("paragraph");
          return;
        }
        // Regular Enter or Shift+Enter: allow default line break behavior
        return;
      }

      if (e.key === "Backspace" && contentRef.current?.innerText === "") {
        e.preventDefault();
        onDelete();
      }

      // Bold
      if (e.key === "b" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.execCommand("bold");
      }

      // Italic
      if (e.key === "i" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.execCommand("italic");
      }

      // Close slash menu on escape
      if (e.key === "Escape") {
        setShowSlashMenu(false);
      }
    };

    // Handle text selection for floating toolbar
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setToolbarPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 });
        setShowToolbar(true);
      } else {
        setShowToolbar(false);
      }
    };

    // Handle slash command selection
    const handleSlashCommand = (type: BlockType) => {
      setShowSlashMenu(false);
      if (contentRef.current) {
        contentRef.current.innerText = "";
      }
      onUpdate({ type, content: "" });
    };

    // Set content on mount
    useEffect(() => {
      if (contentRef.current && block.type !== "divider" && block.type !== "image") {
        contentRef.current.innerText = block.content;
      }
    }, [block.id]);

    // Render block content based on type
    const renderBlockContent = () => {
      if (block.type === "divider") {
        return <hr className="my-4 border-t border-border" />;
      }

      if (block.type === "image") {
        return (
          <div className="my-2">
            {block.metadata.imageUrl ? (
              <img
                src={block.metadata.imageUrl}
                alt=""
                className="max-w-full rounded-lg"
              />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 text-muted-foreground">
                Kattints a kép hozzáadásához
              </div>
            )}
          </div>
        );
      }

      const baseClasses =
        "outline-none w-full min-h-[1.5em] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground";

      const typeClasses: Record<BlockType, string> = {
        paragraph: "text-base",
        heading1: "text-3xl font-bold",
        heading2: "text-2xl font-semibold",
        heading3: "text-xl font-medium",
        bulletList:
          "text-base pl-6 before:content-['•'] before:absolute before:left-0 before:text-muted-foreground relative",
        numberedList: "text-base pl-6",
        quote: "text-base italic border-l-4 border-primary/50 pl-4 text-muted-foreground",
        callout: "",
        divider: "",
        image: "",
      };

      if (block.type === "callout") {
        const calloutColors = {
          info: "bg-accent/10 border-accent/30 text-accent",
          warning: "bg-warning/10 border-warning/30 text-warning",
          tip: "bg-success/10 border-success/30 text-success",
        };
        const calloutType = block.metadata.calloutType || "info";
        const icons = { info: "ℹ️", warning: "⚠️", tip: "💡" };

        return (
          <div
            className={cn(
              "flex gap-3 rounded-lg border p-4",
              calloutColors[calloutType]
            )}
          >
            <span className="text-xl">{icons[calloutType]}</span>
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onMouseUp={handleMouseUp}
              onClick={onSelect}
              data-placeholder="Írj valamit..."
              className={cn(baseClasses, "flex-1")}
            />
          </div>
        );
      }

      return (
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onMouseUp={handleMouseUp}
          onClick={onSelect}
          data-placeholder={
            block.type === "paragraph" ? "Írj valamit, vagy '/' a menühöz..." : ""
          }
          className={cn(baseClasses, typeClasses[block.type])}
        />
      );
    };

    return (
      <div
        ref={ref}
        data-block-id={block.id}
        className={cn(
          "group relative py-1 transition-colors",
          isSelected && "bg-primary/5",
          isDragging && "opacity-50"
        )}
      >
        {/* Drag handle and actions */}
        <div className="absolute -left-8 top-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCreateAfter("paragraph");
            }}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            title="Új bekezdés hozzáadása"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Block content */}
        {renderBlockContent()}

        {/* Slash command menu */}
        {showSlashMenu && (
          <SlashCommandMenu
            position={slashMenuPosition}
            onSelect={handleSlashCommand}
            onClose={() => setShowSlashMenu(false)}
          />
        )}

        {/* Floating toolbar */}
        {showToolbar && (
          <FloatingToolbar
            position={toolbarPosition}
            onClose={() => setShowToolbar(false)}
            showResearchTools={showResearchTools}
            onInsertCitation={onInsertCitation}
            onAIAction={
              onAIAction ? (action, text) => onAIAction(action, text, block.id) : undefined
            }
          />
        )}
      </div>
    );
  }
);
