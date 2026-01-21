import { cn } from "@/lib/utils";

interface ChapterPillTabsProps {
  chapters: { id: string; title: string }[];
  activeChapterId: string | null;
  onSelectChapter: (id: string) => void;
}

export function ChapterPillTabs({ chapters, activeChapterId, onSelectChapter }: ChapterPillTabsProps) {
  return (
    <div className="chapter-pills px-4 -mx-4">
      {chapters.map((chapter) => (
        <button
          key={chapter.id}
          onClick={() => onSelectChapter(chapter.id)}
          className={cn(
            "chapter-pill touch-target",
            activeChapterId === chapter.id && "active"
          )}
        >
          {chapter.title}
        </button>
      ))}
    </div>
  );
}
