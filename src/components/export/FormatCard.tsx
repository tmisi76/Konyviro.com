import { FileText, FileType, BookOpen, File, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExportFormatOption } from "@/types/export";

interface FormatCardProps {
  format: ExportFormatOption;
  isSelected: boolean;
  onSelect: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-8 w-8" />,
  FileType: <FileType className="h-8 w-8" />,
  BookOpen: <BookOpen className="h-8 w-8" />,
  File: <File className="h-8 w-8" />,
};

export function FormatCard({ format, isSelected, onSelect }: FormatCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all hover:border-primary/50",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:bg-muted/50"
      )}
    >
      {isSelected && (
        <div className="absolute right-2 top-2 rounded-full bg-primary p-1">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      <div className={cn("text-muted-foreground", isSelected && "text-primary")}>
        {iconMap[format.icon]}
      </div>
      <div>
        <p className="font-medium text-foreground">{format.name}</p>
        <p className="text-xs text-muted-foreground">{format.description}</p>
      </div>
    </button>
  );
}
