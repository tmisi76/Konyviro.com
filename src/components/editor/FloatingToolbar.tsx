import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, Link, Highlighter, BookMarked, Search, Loader2, RefreshCw, Expand, Shrink } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AIAction } from "@/hooks/useAIGeneration";

interface FloatingToolbarProps {
  position: { x: number; y: number };
  onClose: () => void;
  onInsertCitation?: () => void;
  showResearchTools?: boolean;
  onAIAction?: (action: AIAction, selectedText: string) => void;
}

export function FloatingToolbar({ 
  position, 
  onClose, 
  onInsertCitation,
  showResearchTools = false,
  onAIAction,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isFactChecking, setIsFactChecking] = useState(false);
  const [factCheckResult, setFactCheckResult] = useState<string | null>(null);
  const [showFactCheckModal, setShowFactCheckModal] = useState(false);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handleFactCheck = async () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (!selectedText) {
      toast.error("Válassz ki szöveget az ellenőrzéshez");
      return;
    }

    setIsFactChecking(true);
    setFactCheckResult(null);
    setShowFactCheckModal(true);

    try {
      const { data, error } = await supabase.functions.invoke('fact-check', {
        body: { text: selectedText }
      });

      if (error) throw error;
      
      if (data?.success) {
        setFactCheckResult(data.result);
      } else {
        throw new Error(data?.error || "Ismeretlen hiba");
      }
    } catch (error) {
      console.error("Fact-check error:", error);
      const message = error instanceof Error ? error.message : "Hiba az ellenőrzés során";
      toast.error(message);
      setShowFactCheckModal(false);
    } finally {
      setIsFactChecking(false);
    }
  };

  const handleAIAction = (action: AIAction) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (!selectedText) {
      toast.error("Válassz ki szöveget a művelethez");
      return;
    }

    if (onAIAction) {
      onAIAction(action, selectedText);
      onClose();
    }
  };

  const formatButtons = [
    { icon: Bold, command: "bold", label: "Félkövér" },
    { icon: Italic, command: "italic", label: "Dőlt" },
    { icon: Underline, command: "underline", label: "Aláhúzott" },
    { icon: Highlighter, command: "backColor", value: "#fef08a", label: "Kiemelés" },
    { icon: Link, command: "createLink", label: "Link" },
  ];

  const aiButtons: { icon: typeof RefreshCw; action: AIAction; label: string }[] = [
    { icon: RefreshCw, action: "rewrite", label: "Újraírás" },
    { icon: Expand, action: "expand", label: "Bővítés" },
    { icon: Shrink, action: "shorten", label: "Rövidítés" },
  ];

  const handleClick = (command: string, value?: string) => {
    if (command === "createLink") {
      const url = prompt("Add meg a link URL-jét:");
      if (url) execCommand(command, url);
    } else {
      execCommand(command, value);
    }
  };

  return (
    <>
      <div
        ref={toolbarRef}
        className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg"
        style={{
          left: position.x,
          top: position.y,
          transform: "translate(-50%, -100%)",
        }}
      >
        {/* Format buttons */}
        {formatButtons.map(({ icon: Icon, command, value, label }) => (
          <button
            key={command}
            onClick={() => handleClick(command, value)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            )}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}

        {/* AI tools separator and buttons */}
        {onAIAction && (
          <>
            <div className="mx-1 h-6 w-px bg-border" />
            
            {aiButtons.map(({ icon: Icon, action, label }) => (
              <button
                key={action}
                onClick={() => handleAIAction(action)}
                className={cn(
                  "flex h-8 items-center gap-1 rounded px-2 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                )}
                title={label}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs hidden sm:inline">{label}</span>
              </button>
            ))}
          </>
        )}

        {/* Research tools separator and buttons */}
        {showResearchTools && (
          <>
            <div className="mx-1 h-6 w-px bg-border" />
            
            {onInsertCitation && (
              <button
                onClick={() => {
                  onInsertCitation();
                  onClose();
                }}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                )}
                title="Hivatkozás beszúrása"
              >
                <BookMarked className="h-4 w-4" />
                <span className="text-xs">Hivatkozás</span>
              </button>
            )}
            
            <button
              onClick={handleFactCheck}
              disabled={isFactChecking}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isFactChecking && "opacity-50"
              )}
              title="Ellenőrzés"
            >
              {isFactChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="text-xs">Ellenőrzés</span>
            </button>
          </>
        )}
      </div>

      {/* Fact-check result modal */}
      <Dialog open={showFactCheckModal} onOpenChange={setShowFactCheckModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Tényellenőrzés eredménye
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {isFactChecking ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Ellenőrzés folyamatban...</span>
              </div>
            ) : factCheckResult ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
                  {factCheckResult}
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
