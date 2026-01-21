import { useState } from "react";
import { Sparkles, Wand2, MessageSquare, RefreshCw, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface MobileAIFabProps {
  onAction: (action: string) => void;
  isGenerating?: boolean;
}

const AI_ACTIONS = [
  { id: "continue", icon: Wand2, label: "Folytatás" },
  { id: "rewrite", icon: RefreshCw, label: "Átírás" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
];

export function MobileAIFab({ onAction, isGenerating }: MobileAIFabProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-50 md:hidden">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg transition-all",
              isGenerating && "animate-pulse",
              "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <Sparkles className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {AI_ACTIONS.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={() => {
                onAction(action.id);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 py-3"
            >
              <action.icon className="h-4 w-4" />
              <span>{action.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
