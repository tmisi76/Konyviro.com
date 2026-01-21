import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateProject: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 px-8 py-16 text-center">
      {/* Illustration */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
        <BookOpen className="h-12 w-12 text-primary" />
      </div>

      {/* Text */}
      <h3 className="mb-2 text-xl font-semibold text-foreground">
        Üdv a KönyvÍró AI-ban!
      </h3>
      <p className="mb-6 max-w-md text-muted-foreground">
        Még nincs egyetlen projekted sem. Hozd létre az első könyved, és kezdj el
        írni az AI segítségével!
      </p>

      {/* CTA Button */}
      <Button
        onClick={onCreateProject}
        size="lg"
        className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
      >
        <Plus className="mr-2 h-5 w-5" />
        Hozd létre első könyved
      </Button>
    </div>
  );
}
