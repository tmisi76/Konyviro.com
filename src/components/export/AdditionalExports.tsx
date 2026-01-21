import { List, BookMarked, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdditionalExportsProps {
  projectGenre: string;
  onGenerateTOC: () => void;
  onGenerateBibliography: () => void;
  onExportCharacters: () => void;
  isLoading: boolean;
}

export function AdditionalExports({
  projectGenre,
  onGenerateTOC,
  onGenerateBibliography,
  onExportCharacters,
  isLoading,
}: AdditionalExportsProps) {
  const isFiction = projectGenre === "fiction" || projectGenre === "erotikus";
  const isNonFiction = projectGenre === "szakkonyv";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">További exportok</h3>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onGenerateTOC}
          disabled={isLoading}
        >
          <List className="h-4 w-4" />
          Tartalomjegyzék generálása
        </Button>

        {isNonFiction && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onGenerateBibliography}
            disabled={isLoading}
          >
            <BookMarked className="h-4 w-4" />
            Bibliográfia generálása
          </Button>
        )}

        {isFiction && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onExportCharacters}
            disabled={isLoading}
          >
            <Users className="h-4 w-4" />
            Karakter lista exportálása
          </Button>
        )}
      </div>
    </div>
  );
}
