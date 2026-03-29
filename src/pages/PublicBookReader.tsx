import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, AlertCircle, BookOpen, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSharedBook } from "@/hooks/useBookShare";
import { PasswordGate } from "@/components/reader/PasswordGate";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function PublicBookReader() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { data, isLoading, error, needsPassword, verifyPassword } = useSharedBook(shareToken || "");
  const [activeChapter, setActiveChapter] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Könyv betöltése...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">
            {error instanceof Error ? error.message : "A könyv nem található"}
          </h1>
          <p className="text-muted-foreground mb-6">
            Ellenőrizd a linket, vagy kérj új megosztási linket a szerzőtől.
          </p>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vissza a főoldalra
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <PasswordGate
        bookTitle={data.project.title}
        onVerify={verifyPassword}
      />
    );
  }

  const { project, chapters } = data;
  const currentChapter = chapters[activeChapter];

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border shadow-sm">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
            <h1 className="font-semibold text-foreground truncate text-sm md:text-base">
              {project.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {data.share.allow_download && (
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Letöltés</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chapter sidebar (desktop) */}
        <aside className={cn(
          "hidden lg:flex flex-col border-r border-border bg-card w-64 flex-shrink-0 transition-all",
          !sidebarOpen && "w-0 overflow-hidden"
        )}>
          <div className="p-3 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tartalomjegyzék
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {chapters.map((ch, i) => (
              <button
                key={ch.id || i}
                onClick={() => setActiveChapter(i)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activeChapter === i
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {ch.title || `${i + 1}. fejezet`}
              </button>
            ))}
          </nav>
        </aside>

        {/* PDF-style content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-0">
            {/* Book content - paper style */}
            <div className="flex-1 flex justify-center py-6 md:py-10 px-4">
              <div className="w-full max-w-[720px]">
                {/* Paper */}
                <article className="bg-card rounded-lg shadow-lg border border-border/50 px-8 py-10 md:px-14 md:py-14 min-h-[60vh]">
                  {/* Chapter title */}
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-8 text-center">
                    {currentChapter?.title || `${activeChapter + 1}. fejezet`}
                  </h2>

                  <Separator className="mb-8 mx-auto w-16" />

                  {/* Chapter content */}
                  <div
                    className="prose prose-lg max-w-none text-foreground/90 font-serif leading-relaxed text-justify
                      prose-p:mb-4 prose-p:indent-8 prose-p:first:indent-0
                      prose-headings:font-serif prose-headings:text-foreground
                      prose-blockquote:border-primary/30 prose-blockquote:text-foreground/70"
                    dangerouslySetInnerHTML={{
                      __html: currentChapter?.content || "<p>Nincs tartalom.</p>"
                    }}
                  />
                </article>

                {/* Page navigation */}
                <div className="flex items-center justify-between mt-6 px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveChapter(Math.max(0, activeChapter - 1))}
                    disabled={activeChapter === 0}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Előző fejezet
                  </Button>

                  <span className="text-xs text-muted-foreground">
                    {activeChapter + 1} / {chapters.length}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveChapter(Math.min(chapters.length - 1, activeChapter + 1))}
                    disabled={activeChapter === chapters.length - 1}
                    className="gap-1.5"
                  >
                    Következő fejezet
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Mobile chapter select */}
                <div className="lg:hidden mt-6">
                  <select
                    value={activeChapter}
                    onChange={(e) => setActiveChapter(Number(e.target.value))}
                    className="w-full rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm"
                  >
                    {chapters.map((ch, i) => (
                      <option key={i} value={i}>
                        {ch.title || `${i + 1}. fejezet`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Promo sidebar (desktop) */}
            <aside className="hidden xl:block w-72 flex-shrink-0 p-6">
              <div className="sticky top-20">
                <PromoCard />
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* Mobile promo footer */}
      <div className="xl:hidden border-t border-border bg-card p-4">
        <PromoCard compact />
      </div>

      {/* Powered by footer */}
      <footer className="text-center py-3 text-xs text-muted-foreground border-t border-border bg-card">
        Powered by{" "}
        <a
          href="https://konyviro.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
        >
          KönyvÍró
        </a>
      </footer>
    </div>
  );
}

function PromoCard({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
          <p className="text-sm font-medium text-foreground truncate">
            Írd meg te is a saját könyved!
          </p>
        </div>
        <Button asChild size="sm" className="flex-shrink-0">
          <a href="https://konyviro.com/" target="_blank" rel="noopener noreferrer">
            Kipróbálom
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4 shadow-sm">
      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <BookOpen className="h-6 w-6 text-primary" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">KönyvÍró</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Írd meg te is a saját könyved AI segítségével — regényt, szakkönyvet, mesekönyvet!
        </p>
      </div>

      <Button asChild className="w-full">
        <a href="https://konyviro.com/" target="_blank" rel="noopener noreferrer">
          Kipróbálom ingyen
          <ExternalLink className="h-4 w-4 ml-2" />
        </a>
      </Button>

      <p className="text-xs text-muted-foreground">
        Ingyenes regisztráció • Nincs bankkártya szükség
      </p>
    </div>
  );
}
