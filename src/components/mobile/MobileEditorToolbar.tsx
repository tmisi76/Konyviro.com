import { useState } from "react";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Quote, 
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileEditorToolbarProps {
  onFormat: (format: string) => void;
  activeFormats?: string[];
}

const TOOLS = [
  { id: "bold", icon: Bold, label: "Félkövér" },
  { id: "italic", icon: Italic, label: "Dőlt" },
  { id: "underline", icon: Underline, label: "Aláhúzott" },
  { id: "h1", icon: Heading1, label: "Címsor 1" },
  { id: "h2", icon: Heading2, label: "Címsor 2" },
  { id: "ul", icon: List, label: "Lista" },
  { id: "ol", icon: ListOrdered, label: "Számozott lista" },
  { id: "quote", icon: Quote, label: "Idézet" },
  { id: "alignLeft", icon: AlignLeft, label: "Balra" },
  { id: "alignCenter", icon: AlignCenter, label: "Középre" },
  { id: "alignRight", icon: AlignRight, label: "Jobbra" },
];

export function MobileEditorToolbar({ onFormat, activeFormats = [] }: MobileEditorToolbarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md pb-safe">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-2 py-2">
        {TOOLS.map((tool) => (
          <Button
            key={tool.id}
            variant="ghost"
            size="icon"
            onClick={() => onFormat(tool.id)}
            className={cn(
              "h-10 w-10 shrink-0 touch-target",
              activeFormats.includes(tool.id) && "bg-primary/10 text-primary"
            )}
            title={tool.label}
          >
            <tool.icon className="h-5 w-5" />
          </Button>
        ))}
      </div>
    </div>
  );
}
