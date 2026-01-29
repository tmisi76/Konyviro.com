import { useState, useRef, useEffect } from "react";
import { ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Chapter {
  id: string;
  title: string;
  content: string | null;
  sort_order: number;
  word_count: number;
}

interface BookScrollViewProps {
  title: string;
  chapters: Chapter[];
  className?: string;
}

export function BookScrollView({ title, chapters, className }: BookScrollViewProps) {
  const [activeChapter, setActiveChapter] = useState(chapters[0]?.id || "");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chapterRefs = useRef<Record<string, HTMLElement | null>>({});

  // Scroll to chapter
  const scrollToChapter = (chapterId: string) => {
    const ref = chapterRefs.current[chapterId];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveChapter(chapterId);
      setSidebarOpen(false);
    }
  };

  // Track active chapter on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveChapter(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    Object.values(chapterRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [chapters]);

  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg truncate">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {chapters.length} fejezet
          </p>
        </div>
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                onClick={() => scrollToChapter(chapter.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activeChapter === chapter.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span className="text-xs text-muted-foreground mr-2">
                  {index + 1}.
                </span>
                {chapter.title}
              </button>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden fixed bottom-4 left-4 z-50 rounded-full shadow-lg"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="truncate">{title}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-5rem)]">
            <nav className="p-2 space-y-1">
              {chapters.map((chapter, index) => (
                <button
                  key={chapter.id}
                  onClick={() => scrollToChapter(chapter.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    activeChapter === chapter.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="text-xs text-muted-foreground mr-2">
                    {index + 1}.
                  </span>
                  {chapter.title}
                </button>
              ))}
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto py-8 px-4 md:px-8">
          {/* Book Title */}
          <header className="mb-12 text-center">
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">{title}</h1>
            <div className="h-px w-24 bg-border mx-auto" />
          </header>

          {/* Chapters */}
          <div className="space-y-16">
            {chapters.map((chapter, index) => (
              <article
                key={chapter.id}
                id={chapter.id}
                ref={(el) => (chapterRefs.current[chapter.id] = el)}
                className="scroll-mt-8"
              >
                <header className="mb-6">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
                    {index + 1}. fejezet
                  </p>
                  <h2 className="text-2xl md:text-3xl font-serif font-semibold">
                    {chapter.title}
                  </h2>
                </header>
                <div className="prose prose-lg dark:prose-invert max-w-none font-serif leading-relaxed">
                  {chapter.content ? (
                    chapter.content.split("\n\n").map((paragraph, pIndex) => (
                      <p key={pIndex} className="mb-4 text-justify first-letter:text-4xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:mt-1">
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground italic">
                      Ez a fejezet még nem készült el.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* End */}
          <footer className="mt-16 text-center py-8 border-t">
            <p className="text-muted-foreground font-serif italic">— Vége —</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
