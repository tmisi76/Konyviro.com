import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AdultBadge } from "@/components/ui/adult-badge";
import type { ProjectFormData } from "../CreateProjectModal";

interface GenreOption {
  id: ProjectFormData["genre"];
  icon: string;
  title: string;
  description: string;
  isAdult?: boolean;
}

const genres: GenreOption[] = [
  {
    id: "szakkönyv",
    icon: "📚",
    title: "Szakkönyv",
    description: "Tudásmegosztás, oktatás, szakmai tartalom",
  },
  {
    id: "fiction",
    icon: "✨",
    title: "Fiction",
    description: "Regények, novellák, kreatív történetek",
  },
  {
    id: "erotikus",
    icon: "🔥",
    title: "Erotikus",
    description: "Felnőtt tartalom (18+)",
    isAdult: true,
  },
];

interface StepGenreProps {
  selected: ProjectFormData["genre"];
  onSelect: (genre: ProjectFormData["genre"]) => void;
  onNext: () => void;
  canProceed: boolean;
  isAdultVerified?: boolean;
}

export function StepGenre({ selected, onSelect, onNext, canProceed, isAdultVerified }: StepGenreProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Válassz műfajt</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Milyen típusú könyvet szeretnél írni?
        </p>
      </div>

      <div className="mb-8 grid gap-4">
        {genres.map((genre) => {
          const isMuted = genre.isAdult && !isAdultVerified && selected !== genre.id;
          
          return (
            <button
              key={genre.id}
              onClick={() => onSelect(genre.id)}
              className={cn(
                "flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all duration-200",
                selected === genre.id
                  ? "border-secondary bg-secondary/10 shadow-md"
                  : isMuted
                  ? "border-border bg-muted/30 opacity-60 hover:opacity-100"
                  : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
              )}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-3xl">
                {genre.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3
                    className={cn(
                      "text-lg font-semibold",
                      selected === genre.id ? "text-secondary" : "text-foreground"
                    )}
                  >
                    {genre.title}
                  </h3>
                  {genre.isAdult && isAdultVerified && <AdultBadge />}
                </div>
                <p className="text-sm text-muted-foreground">{genre.description}</p>
              </div>
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  selected === genre.id
                    ? "border-secondary bg-secondary text-secondary-foreground"
                    : "border-border"
                )}
              >
                {selected === genre.id && (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          Következő
        </Button>
      </div>
    </div>
  );
}
