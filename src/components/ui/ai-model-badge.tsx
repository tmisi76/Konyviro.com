import { Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getModelDisplayName } from "@/hooks/useAIModel";

interface AIModelBadgeProps {
  modelId: string;
  variant?: "default" | "minimal" | "detailed";
  description?: string;
  className?: string;
}

const MODEL_DESCRIPTIONS: Record<string, string> = {
  "google/gemini-2.5-pro": "Prémium modell a magyar nyelvtanhoz és stilisztikához",
  "google/gemini-3-flash-preview": "Gyors és hatékony AI generálás",
  "google/gemini-2.5-flash": "Kiegyensúlyozott teljesítmény",
  "openai/gpt-5": "Legfejlettebb OpenAI modell",
};

export function AIModelBadge({ 
  modelId, 
  variant = "default", 
  description,
  className,
}: AIModelBadgeProps) {
  const displayName = getModelDisplayName(modelId);
  const modelDescription = description || MODEL_DESCRIPTIONS[modelId] || "";

  if (variant === "minimal") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn("gap-1 text-xs", className)}
          >
            <Sparkles className="h-3 w-3" />
            AI
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{displayName}</p>
          {modelDescription && (
            <p className="text-xs text-muted-foreground">{modelDescription}</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="outline" className="gap-1.5 py-1 px-2">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{displayName}</span>
        </Badge>
        {modelDescription && (
          <span className="text-xs text-muted-foreground">
            {modelDescription}
          </span>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "gap-1.5 text-xs bg-primary/5 border-primary/20 hover:bg-primary/10",
            className
          )}
        >
          <Zap className="h-3 w-3 text-primary" />
          {displayName}
        </Badge>
      </TooltipTrigger>
      {modelDescription && (
        <TooltipContent>
          <p className="text-xs">{modelDescription}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
