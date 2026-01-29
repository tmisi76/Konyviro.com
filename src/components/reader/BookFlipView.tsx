import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

// Split content into pages based on estimated character count
function splitIntoPages(content: string, charsPerPage: number = 1500): string[] {
  if (!content) return [];
  
  const paragraphs = content.split("\n\n");
  const pages: string[] = [];
  let currentPage = "";
  
  for (const paragraph of paragraphs) {
    if ((currentPage + paragraph).length > charsPerPage && currentPage) {
      pages.push(currentPage.trim());
      currentPage = paragraph;
    } else {
      currentPage += (currentPage ? "\n\n" : "") + paragraph;
    }
  }
  
  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }
  
  return pages;
}

export function BookFlipView({ title, chapters, className }: BookFlipViewProps) {
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Build all pages: title page + chapter pages
  const allPages: { type: "title" | "chapter-title" | "content"; content: string; chapterIndex?: number }[] = [
    { type: "title", content: title },
  ];
  
  chapters.forEach((chapter, index) => {
    allPages.push({ type: "chapter-title", content: chapter.title, chapterIndex: index });
    const contentPages = splitIntoPages(chapter.content || "");
    contentPages.forEach((page) => {
      allPages.push({ type: "content", content: page, chapterIndex: index });
    });
  });
  
  // Add empty page if odd number for proper spread
  if (allPages.length % 2 !== 0) {
    allPages.push({ type: "content", content: "" });
  }
  
  const totalSpreads = Math.ceil(allPages.length / 2);
  
  const goNext = useCallback(() => {
    if (currentSpread < totalSpreads - 1 && !isAnimating) {
      setIsAnimating(true);
      setCurrentSpread((prev) => prev + 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentSpread, totalSpreads, isAnimating]);
  
  const goPrev = useCallback(() => {
    if (currentSpread > 0 && !isAnimating) {
      setIsAnimating(true);
      setCurrentSpread((prev) => prev - 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentSpread, isAnimating]);
  
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
  
  const leftPageIndex = currentSpread * 2;
  const rightPageIndex = currentSpread * 2 + 1;
  const leftPage = allPages[leftPageIndex];
  const rightPage = allPages[rightPageIndex];
  
  const renderPage = (page: typeof allPages[0] | undefined, pageNumber: number) => {
    if (!page) return null;
    
    return (
      <div className="h-full flex flex-col p-6 md:p-8 overflow-hidden">
        {page.type === "title" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h1 className="text-2xl md:text-4xl font-serif font-bold leading-tight">
              {page.content}
            </h1>
            <div className="mt-8 h-px w-16 bg-border" />
          </div>
        ) : page.type === "chapter-title" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              {(page.chapterIndex ?? 0) + 1}. fejezet
            </p>
            <h2 className="text-xl md:text-3xl font-serif font-semibold">
              {page.content}
            </h2>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <div className="prose prose-sm dark:prose-invert max-w-none font-serif leading-relaxed text-justify">
              {page.content.split("\n\n").map((p, i) => (
                <p key={i} className="mb-3 text-sm md:text-base">
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}
        
        {/* Page number */}
        <div className="mt-auto pt-4 text-center text-xs text-muted-foreground">
          {pageNumber}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-screen bg-muted/30 p-4", className)}>
      {/* Book Container */}
      <div 
        className={cn(
          "relative w-full max-w-5xl aspect-[2/1.4] md:aspect-[2/1.3] bg-background rounded-lg shadow-2xl overflow-hidden",
          "transition-transform duration-300",
          isAnimating && "scale-[0.98]"
        )}
      >
        {/* Book Spine */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border z-10" />
        
        {/* Pages */}
        <div className="grid grid-cols-2 h-full">
          {/* Left Page */}
          <div className="border-r border-border/50 bg-gradient-to-l from-muted/20 to-background">
            {renderPage(leftPage, leftPageIndex + 1)}
          </div>
          
          {/* Right Page */}
          <div className="bg-gradient-to-r from-muted/20 to-background">
            {renderPage(rightPage, rightPageIndex + 1)}
          </div>
        </div>
        
        {/* Page curl effect */}
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-black/5 to-transparent pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/5 to-transparent pointer-events-none" />
      </div>
      
      {/* Navigation */}
      <div className="flex items-center gap-4 mt-6">
        <Button
          variant="outline"
          size="icon"
          onClick={goPrev}
          disabled={currentSpread === 0 || isAnimating}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <span className="text-sm text-muted-foreground min-w-[100px] text-center">
          {currentSpread + 1} / {totalSpreads}
        </span>
        
        <Button
          variant="outline"
          size="icon"
          onClick={goNext}
          disabled={currentSpread >= totalSpreads - 1 || isAnimating}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground mt-3">
        Használd a ← → billentyűket a lapozáshoz
      </p>
    </div>
  );
}
