import { Type, Bold, Italic, Link, Image, List, ListOrdered, Heading1, Heading2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EmailToolbarProps {
  onFormat: (command: string, value?: string) => void;
  onLink: () => void;
  onImage: () => void;
}

const tools = [
  { 
    icon: Type, 
    label: 'Normál szöveg', 
    command: 'formatBlock',
    value: 'p',
    type: 'format'
  },
  { 
    icon: Heading1, 
    label: 'Címsor 1', 
    command: 'formatBlock',
    value: 'h1',
    type: 'format'
  },
  { 
    icon: Heading2, 
    label: 'Címsor 2', 
    command: 'formatBlock',
    value: 'h2',
    type: 'format'
  },
  { type: 'separator' },
  { 
    icon: Bold, 
    label: 'Félkövér', 
    command: 'bold',
    type: 'format'
  },
  { 
    icon: Italic, 
    label: 'Dőlt', 
    command: 'italic',
    type: 'format'
  },
  { type: 'separator' },
  { 
    icon: Link, 
    label: 'Link', 
    type: 'link'
  },
  { 
    icon: Image, 
    label: 'Kép', 
    type: 'image'
  },
  { type: 'separator' },
  { 
    icon: List, 
    label: 'Lista', 
    command: 'insertUnorderedList',
    type: 'format'
  },
  { 
    icon: ListOrdered, 
    label: 'Számozott lista', 
    command: 'insertOrderedList',
    type: 'format'
  },
] as const;

export function EmailToolbar({ onFormat, onLink, onImage }: EmailToolbarProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tools.map((tool, index) => {
        if (tool.type === 'separator') {
          return <Separator key={index} orientation="vertical" className="h-6 mx-1" />;
        }

        const Icon = tool.icon;
        
        const handleClick = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (tool.type === 'link') {
            onLink();
          } else if (tool.type === 'image') {
            onImage();
          } else if (tool.type === 'format' && 'command' in tool) {
            onFormat(tool.command, 'value' in tool ? tool.value : undefined);
          }
        };
        
        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleClick}
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
