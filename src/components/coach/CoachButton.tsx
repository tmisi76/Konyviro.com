import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { BookCoachModal } from "./BookCoachModal";
import { CoachSummary } from "@/hooks/useBookCoach";
import { cn } from "@/lib/utils";

interface CoachButtonProps {
  genre: "szakkönyv" | "fiction" | "erotikus";
  onComplete: (summary: CoachSummary) => void;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function CoachButton({ 
  genre, 
  onComplete, 
  variant = "outline",
  size = "default",
  className 
}: CoachButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={cn("gap-2", className)}
      >
        <Sparkles className="h-4 w-4" />
        Könyv Coach
      </Button>

      <BookCoachModal
        open={isOpen}
        onOpenChange={setIsOpen}
        genre={genre}
        onComplete={onComplete}
      />
    </>
  );
}
