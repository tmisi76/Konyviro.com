import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { contentToParagraphs } from "@/lib/contentUtils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Chapter {
  id: string;
  title: string;
  content: string | null;
  sort_order: number;
}

interface BookFlipViewProps {
  title: string;
  chapters: Chapter[];
  className?: string;
}

interface PageData {
  type: "title" | "chapter-title" | "content";
  paragraphs: string[];
  chapterIndex?: number;
  chapterTitle?: string;
}

function splitParagraphsIntoPages(paragraphs: string[], charsPerPage = 1200): string[][] {
  if (!paragraphs.length) return [];
  const pages: string[][] = [];
  let currentPage: string[] = [];
  let currentLen = 0;

  for (const p of paragraphs) {
    if (currentLen + p.length > charsPerPage && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [p];
      currentLen = p.length;
    } else {
      currentPage.push(p);
      currentLen += p.length;
    }
  }
  if (currentPage.length) pages.push(currentPage);
  return pages;
}

export function BookFlipView({ title, chapters, className }: BookFlipViewProps) {
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const charsPerPage = isMobile ? 600 : 1200;

  // Build all pages
  const allPages: PageData[] = [
    { type: "title", paragraphs: [title] },
  ];

  chapters.forEach((chapter, index) => {
    allPages.push({
      type: "chapter-title",
      paragraphs: [],
      chapterIndex: index,
      chapterTitle: chapter.title,
    });

    const paragraphs = contentToParagraphs(chapter.content);
    const contentPages = splitParagraphsIntoPages(paragraphs, charsPerPage);
    contentPages.forEach((pageParagraphs) => {
      allPages.push({
        type: "content",
        paragraphs: pageParagraphs,
        chapterIndex: index,
      });
    });
  });

  // For desktop spread: pad to even
  if (!isMobile && allPages.length % 2 !== 0) {
    allPages.push({ type: "content", paragraphs: [] });
  }

  const pagesPerStep = isMobile ? 1 : 2;
  const totalSteps = isMobile ? allPages.length : Math.ceil(allPages.length / 2);

  const goNext = useCallback(() => {
    if (currentPage < totalSteps - 1 && !isAnimating) {
      setIsAnimating(true);
      setCurrentPage((prev) => prev + 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentPage, totalSteps, isAnimating]);

  const goPrev = useCallback(() => {
    if (currentPage > 0 && !isAnimating) {
      setIsAnimating(true);
      setCurrentPage((prev) => prev - 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentPage, isAnimating]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) goNext();
      else goPrev();
    }
  };

  const renderPage = (page: PageData | undefined, pageNumber: number) => {
    if (!page) return null;

    return (
      <div className={cn("h-full flex flex-col overflow-hidden", isMobile ? "p-4" : "p-6 md:p-8")}>
        {page.type === "title" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h1 className={cn(
              "font-serif font-bold leading-tight text-foreground",
              isMobile ? "text-xl" : "text-2xl md:text-4xl"
            )}>
              {page.paragraphs[0]}
            </h1>
            <div className="mt-6 h-px w-16 bg-border" />
          </div>
        ) : page.type === "chapter-title" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              {(page.chapterIndex ?? 0) + 1}. fejezet
            </p>
            <h2 className={cn(
              "font-serif font-semibold text-foreground",
              isMobile ? "text-lg" : "text-xl md:text-3xl"
            )}>
              {page.chapterTitle}
            </h2>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <div className="font-serif leading-relaxed text-justify text-foreground">
              {page.paragraphs.map((p, i) => (
                <p key={i} className={cn("mb-2.5", isMobile ? "text-sm" : "text-sm md:text-base")} style={{ textIndent: i > 0 ? "1.5em" : 0 }}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-3 text-center text-xs text-muted-foreground">
          {pageNumber}
        </div>
      </div>
    );
  };

  // Mobile: single page view
  if (isMobile) {
    const page = allPages[currentPage];

    return (
      <div
        className={cn("flex flex-col items-center justify-center flex-1 bg-muted/30 px-2 py-4", className)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn(
            "relative w-full flex-1 bg-background rounded-lg shadow-xl overflow-hidden",
            "transition-transform duration-300",
            isAnimating && "scale-[0.98]"
          )}
        >
          {renderPage(page, currentPage + 1)}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4 mt-4">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={goPrev}
            disabled={currentPage === 0 || isAnimating}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <span className="text-sm text-muted-foreground min-w-[80px] text-center">
            {currentPage + 1} / {totalSteps}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={goNext}
            disabled={currentPage >= totalSteps - 1 || isAnimating}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Desktop: spread (2 pages)
  const leftPageIndex = currentPage * 2;
  const rightPageIndex = currentPage * 2 + 1;
  const leftPage = allPages[leftPageIndex];
  const rightPage = allPages[rightPageIndex];

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-screen bg-muted/30 p-4", className)}>
      <div
        className={cn(
          "relative w-full max-w-5xl aspect-[2/1.3] bg-background rounded-lg shadow-2xl overflow-hidden",
          "transition-transform duration-300",
          isAnimating && "scale-[0.98]"
        )}
      >
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border z-10" />

        <div className="grid grid-cols-2 h-full">
          <div className="border-r border-border/50 bg-gradient-to-l from-muted/20 to-background">
            {renderPage(leftPage, leftPageIndex + 1)}
          </div>
          <div className="bg-gradient-to-r from-muted/20 to-background">
            {renderPage(rightPage, rightPageIndex + 1)}
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-black/5 to-transparent pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/5 to-transparent pointer-events-none" />
      </div>

      <div className="flex items-center gap-4 mt-6">
        <Button variant="outline" size="icon" onClick={goPrev} disabled={currentPage === 0 || isAnimating}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground min-w-[100px] text-center">
          {currentPage + 1} / {totalSteps}
        </span>
        <Button variant="outline" size="icon" onClick={goNext} disabled={currentPage >= totalSteps - 1 || isAnimating}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Használd a ← → billentyűket a lapozáshoz
      </p>
    </div>
  );
}
