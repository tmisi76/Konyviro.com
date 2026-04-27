import { useState } from "react";
import { Loader2, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AIContinueButtonProps {
  projectId: string;
  chapterId: string | null;
  /** Text up to the cursor — used as continuation context. */
  contextText: string;
  paragraphCount?: number;
  /** Called with the generated text when the user accepts it. */
  onInsert: (text: string) => void;
  className?: string;
  variant?: "default" | "compact";
}

export function AIContinueButton({
  projectId,
  chapterId,
  contextText,
  paragraphCount = 1,
  onInsert,
  className,
  variant = "default",
}: AIContinueButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!chapterId) {
      toast.error("Először nyiss meg egy fejezetet");
      return;
    }
    if (!contextText || contextText.trim().length < 30) {
      toast.error("Írj legalább pár mondatot, mielőtt használnád az AI folytatást");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-continue-text", {
        body: { projectId, chapterId, contextText, paragraphCount },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = (data?.text as string) || "";
      if (!text) {
        toast.error("Nem érkezett szöveg");
        return;
      }
      onInsert(text);
      toast.success("AI folytatás beillesztve");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI folytatás sikertelen";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className={cn("h-8 w-8", className)}
              onClick={handleClick}
              disabled={loading}
              aria-label="AI folytatás"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>AI folytatás (1 bekezdés)</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={cn("gap-2", className)}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Folytatás generálása...
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          AI Folytatás (1 bekezdés)
        </>
      )}
    </Button>
  );
}