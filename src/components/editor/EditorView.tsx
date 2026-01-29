import { EditorBlock } from "@/components/editor/EditorBlock";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import type { Block, BlockType } from "@/types/editor";
import type { AIAction } from "@/hooks/useAIGeneration";

interface EditorViewProps {
  isLoading?: boolean;
  blocks: Block[];
  selectedBlockId: string | null;
  draggedBlockId: string | null;
  supportsResearch: boolean;
  onSelectBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, updates: Partial<Block>) => void;
  onDeleteBlock: (blockId: string) => void;
  onCreateBlockAfter: (blockId: string, type?: BlockType) => void;
  onDragStart: (blockId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetBlockId: string) => void;
  onInsertCitation: () => void;
  onAIAction: (action: AIAction, selectedText: string, blockId: string) => void;
  onCreateEmptyBlock: () => void;
}

export function EditorView({
  isLoading,
  blocks,
  selectedBlockId,
  draggedBlockId,
  supportsResearch,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  onCreateBlockAfter,
  onDragStart,
  onDragEnd,
  onDrop,
  onInsertCitation,
  onAIAction,
  onCreateEmptyBlock,
}: EditorViewProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[700px] px-16 py-8">
          <ContentSkeleton variant="editor" count={1} />
        </div>
      </div>
    );
  }

  return (
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
              onDrop(block.id);
            }}
          >
            <EditorBlock
              block={block}
              isSelected={selectedBlockId === block.id}
              onSelect={() => onSelectBlock(block.id)}
              onUpdate={(updates) => onUpdateBlock(block.id, updates)}
              onDelete={() => onDeleteBlock(block.id)}
              onCreateAfter={(type) => onCreateBlockAfter(block.id, type)}
              onDragStart={() => onDragStart(block.id)}
              onDragEnd={onDragEnd}
              isDragging={draggedBlockId === block.id}
              showResearchTools={supportsResearch}
              onInsertCitation={onInsertCitation}
              onAIAction={onAIAction}
            />
          </div>
        ))}

        {/* Empty area click to add block */}
        <div
          className="h-32 cursor-text"
          onClick={() => {
            if (blocks.length === 0) {
              onCreateEmptyBlock();
            }
          }}
        />
      </div>
    </div>
  );
}
