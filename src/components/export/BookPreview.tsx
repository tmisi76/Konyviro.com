import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ExportSettings } from "@/types/export";
import type { Chapter } from "@/types/editor";

interface BookPreviewProps {
  projectTitle: string;
  authorName?: string;
  chapters: Chapter[];
  chapterContents: Record<string, string>;
  settings: ExportSettings;
}

const fontSizeMap: Record<string, string> = {
  "11pt": "text-[11pt]",
  "12pt": "text-[12pt]",
  "14pt": "text-[14pt]",
};

const lineSpacingMap: Record<string, string> = {
  "1.0": "leading-normal",
  "1.5": "leading-relaxed",
  "2.0": "leading-loose",
};

export function BookPreview({
  projectTitle,
  authorName,
  chapters,
  chapterContents,
  settings,
}: BookPreviewProps) {
  const fontClass = fontSizeMap[settings.fontSize] || "text-[12pt]";
  const lineClass = lineSpacingMap[settings.lineSpacing] || "leading-relaxed";

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white shadow-lg">
      {/* Book header */}
      <div className="border-b border-border bg-muted/30 px-4 py-2">
        <p className="text-sm font-medium text-muted-foreground">Előnézet</p>
      </div>

      <ScrollArea className="flex-1">
        <div
          className={cn(
            "mx-auto max-w-[600px] space-y-8 p-8 text-black",
            fontClass,
            lineClass
          )}
          style={{ fontFamily: settings.fontFamily }}
        >
          {/* Title Page */}
          {settings.includeTitlePage && (
            <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
              <h1 className="mb-6 text-4xl font-bold">{projectTitle}</h1>
              {authorName && (
                <p className="text-xl text-gray-600">{authorName}</p>
              )}
            </div>
          )}

          {/* Table of Contents */}
          {settings.includeTableOfContents && chapters.length > 0 && (
            <div className="page-break-after">
              <h2 className="mb-6 text-2xl font-bold">Tartalomjegyzék</h2>
              <ul className="space-y-2">
                {chapters.map((chapter, index) => (
                  <li key={chapter.id} className="flex items-baseline gap-2">
                    <span className="text-gray-500">{index + 1}.</span>
                    <span className="flex-1 border-b border-dotted border-gray-300">
                      {chapter.title}
                    </span>
                    <span className="text-gray-500">{index + 1}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Chapters */}
          {chapters.map((chapter, index) => (
            <div key={chapter.id} className="page-break-before">
              <h2 className="mb-4 text-2xl font-bold">
                {index + 1}. {chapter.title}
              </h2>
              <div className="whitespace-pre-wrap">
                {chapterContents[chapter.id] || (
                  <p className="italic text-gray-400">
                    (Üres fejezet)
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {chapters.length === 0 && (
            <div className="flex min-h-[200px] items-center justify-center text-gray-400">
              <p>Nincs megjeleníthető tartalom</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
