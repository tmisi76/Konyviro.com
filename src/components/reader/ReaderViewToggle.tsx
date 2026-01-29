import { BookOpen, ScrollText } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ReaderViewToggleProps {
  value: "scroll" | "flipbook";
  onChange: (value: "scroll" | "flipbook") => void;
}

export function ReaderViewToggle({ value, onChange }: ReaderViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as "scroll" | "flipbook")}
      className="border rounded-lg p-1"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="scroll" aria-label="Görgetős nézet" className="h-8 w-8 p-0">
            <ScrollText className="h-4 w-4" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Görgetős nézet</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="flipbook" aria-label="Könyv nézet" className="h-8 w-8 p-0">
            <BookOpen className="h-4 w-4" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Könyv nézet</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}
