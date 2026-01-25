import { Bold, Italic, Link, Image, List, ListOrdered, Heading1, Heading2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EmailToolbarProps {
  onInsertTag: (openTag: string, closeTag: string) => void;
  onInsertSingleTag: (tag: string) => void;
}

const tools = [
  { 
    icon: Heading1, 
    label: 'Címsor 1', 
    openTag: '<h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: bold;">', 
    closeTag: '</h1>',
    type: 'pair'
  },
  { 
    icon: Heading2, 
    label: 'Címsor 2', 
    openTag: '<h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: bold;">', 
    closeTag: '</h2>',
    type: 'pair'
  },
  { type: 'separator' },
  { 
    icon: Bold, 
    label: 'Félkövér', 
    openTag: '<strong>', 
    closeTag: '</strong>',
    type: 'pair'
  },
  { 
    icon: Italic, 
    label: 'Dőlt', 
    openTag: '<em>', 
    closeTag: '</em>',
    type: 'pair'
  },
  { type: 'separator' },
  { 
    icon: Link, 
    label: 'Link', 
    openTag: '<a href="URL" style="color: #6366f1; text-decoration: underline;">', 
    closeTag: '</a>',
    type: 'pair'
  },
  { 
    icon: Image, 
    label: 'Kép', 
    tag: '<img src="URL" alt="Leírás" style="max-width: 100%; height: auto;" />',
    type: 'single'
  },
  { type: 'separator' },
  { 
    icon: List, 
    label: 'Lista', 
    openTag: '<ul style="margin: 0 0 16px 0; padding-left: 20px;">\n  <li>', 
    closeTag: '</li>\n</ul>',
    type: 'pair'
  },
  { 
    icon: ListOrdered, 
    label: 'Számozott lista', 
    openTag: '<ol style="margin: 0 0 16px 0; padding-left: 20px;">\n  <li>', 
    closeTag: '</li>\n</ol>',
    type: 'pair'
  },
] as const;

export function EmailToolbar({ onInsertTag, onInsertSingleTag }: EmailToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-1 border rounded-md bg-muted/30 flex-wrap">
      {tools.map((tool, index) => {
        if (tool.type === 'separator') {
          return <Separator key={index} orientation="vertical" className="h-6 mx-1" />;
        }

        const Icon = tool.icon;
        
        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  if (tool.type === 'single' && 'tag' in tool) {
                    onInsertSingleTag(tool.tag);
                  } else if (tool.type === 'pair' && 'openTag' in tool && 'closeTag' in tool) {
                    onInsertTag(tool.openTag, tool.closeTag);
                  }
                }}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
