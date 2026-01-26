import { useCallback, useState } from "react";
import { useAIGeneration, AIAction, AISettings, AIContext } from "@/hooks/useAIGeneration";
import { toast } from "sonner";
import type { Block } from "@/types/editor";

interface UseInlineAIProps {
  projectId: string;
  activeChapterId: string | null;
  projectGenre: string | undefined;
  projectDescription: string | undefined;
  projectTone: string | undefined;
  blocks: Block[];
  charactersContext: string | undefined;
  updateBlock: (blockId: string, updates: Partial<Block>) => void;
}

export function useInlineAI({
  projectId,
  activeChapterId,
  projectGenre,
  projectDescription,
  projectTone,
  blocks,
  charactersContext,
  updateBlock,
}: UseInlineAIProps) {
  const [isInlineGenerating, setIsInlineGenerating] = useState(false);
  const [inlineGeneratingBlockId, setInlineGeneratingBlockId] = useState<string | null>(null);

  // AI generation for inline actions
  const { generate: aiGenerate, reset: aiReset } = useAIGeneration({
    projectId,
    chapterId: activeChapterId || undefined,
    genre: projectGenre,
  });

  // Handle inline AI action from FloatingToolbar
  const handleInlineAIAction = useCallback(async (action: AIAction, selectedText: string, blockId: string) => {
    if (!selectedText.trim()) {
      toast.error("Válassz ki szöveget a művelethez");
      return;
    }

    setIsInlineGenerating(true);
    setInlineGeneratingBlockId(blockId);

    const context: AIContext = {
      bookDescription: projectDescription,
      tone: projectTone,
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
  }, [projectDescription, projectTone, blocks, charactersContext, updateBlock, aiGenerate, aiReset]);

  return {
    handleInlineAIAction,
    isInlineGenerating,
    inlineGeneratingBlockId,
  };
}
