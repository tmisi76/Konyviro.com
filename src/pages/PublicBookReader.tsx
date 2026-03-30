import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, AlertCircle, BookOpen, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSharedBook } from "@/hooks/useBookShare";
import { PasswordGate } from "@/components/reader/PasswordGate";
import { Separator } from "@/components/ui/separator";
import { ReaderSettings, loadReaderSettings, themeStyles } from "@/components/reader/ReaderSettings";
import type { ReaderSettingsState } from "@/components/reader/ReaderSettings";
import { cn } from "@/lib/utils";

function contentToHtml(content: string | null): string {
  if (!content) return "<p>Nincs tartalom.</p>";
  if (content.includes("<p>") || content.includes("<p ")) return content;
  return content
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join("\n");
}

export default function PublicBookReader() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { data, isLoading, error, needsPassword, verifyPassword } = useSharedBook(shareToken || "");
  const [activeChapter, setActiveChapter] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [readerSettings, setReaderSettings] = useState<ReaderSettingsState>(loadReaderSettings);

  const theme = themeStyles[readerSettings.theme];

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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme.bg, color: theme.text }}>
      {/* Top bar */}
      <header className="sticky top-0 z-50 backdrop-blur border-b shadow-sm"
        style={{ backgroundColor: theme.bg + "ee", borderColor: theme.muted + "30" }}>
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="h-5 w-5 flex-shrink-0" style={{ color: theme.muted }} />
            <h1 className="font-semibold truncate text-sm md:text-base">
              {project.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <ReaderSettings settings={readerSettings} onChange={setReaderSettings} />
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
          "hidden lg:flex flex-col border-r w-64 flex-shrink-0 transition-all",
          !sidebarOpen && "w-0 overflow-hidden"
        )} style={{ borderColor: theme.muted + "30", backgroundColor: theme.bg }}>
          <div className="p-3 border-b" style={{ borderColor: theme.muted + "30" }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.muted }}>
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
                    ? "font-medium"
                    : "hover:opacity-80"
                )}
                style={{
                  color: activeChapter === i ? theme.text : theme.muted,
                  backgroundColor: activeChapter === i ? theme.muted + "18" : "transparent",
                }}
              >
                {ch.title || `${i + 1}. fejezet`}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-0">
            {/* Book content */}
            <div className="flex-1 flex justify-center py-6 md:py-10 px-4">
              <div className="w-full max-w-[720px]">
                {/* Paper */}
                <article
                  className="rounded-lg shadow-lg px-8 py-10 md:px-14 md:py-14 min-h-[60vh]"
                  style={{
                    backgroundColor: readerSettings.theme === "white" ? "#ffffff" : theme.bg,
                    border: `1px solid ${theme.muted}20`,
                    boxShadow: readerSettings.theme === "dark"
                      ? "0 4px 24px rgba(0,0,0,0.4)"
                      : "0 4px 24px rgba(0,0,0,0.08)",
                  }}
                >
                  {/* Chapter title */}
                  <h2
                    className="text-2xl md:text-3xl font-bold mb-8 text-center"
                    style={{ fontFamily: readerSettings.fontFamily, color: theme.text }}
                  >
                    {currentChapter?.title || `${activeChapter + 1}. fejezet`}
                  </h2>

                  <Separator className="mb-8 mx-auto w-16" style={{ backgroundColor: theme.muted + "40" }} />

                  {/* Chapter content with ebook styling */}
                  <div
                    className="prose max-w-none ebook-content"
                    style={{
                      fontFamily: readerSettings.fontFamily,
                      fontSize: `${readerSettings.fontSize}px`,
                      lineHeight: readerSettings.lineHeight,
                      color: theme.text,
                      textAlign: "justify" as const,
                      hyphens: "auto" as const,
                      WebkitHyphens: "auto" as const,
                    }}
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
                    style={{ color: theme.muted }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Előző fejezet
                  </Button>

                  <span className="text-xs" style={{ color: theme.muted }}>
                    {activeChapter + 1} / {chapters.length}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveChapter(Math.min(chapters.length - 1, activeChapter + 1))}
                    disabled={activeChapter === chapters.length - 1}
                    className="gap-1.5"
                    style={{ color: theme.muted }}
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
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    style={{
                      backgroundColor: theme.bg,
                      color: theme.text,
                      borderColor: theme.muted + "40",
                    }}
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
      <div className="xl:hidden border-t p-4" style={{ borderColor: theme.muted + "30", backgroundColor: theme.bg }}>
        <PromoCard compact />
      </div>

      {/* Powered by footer */}
      <footer className="text-center py-3 text-xs border-t" style={{ borderColor: theme.muted + "30", color: theme.muted }}>
        Powered by{" "}
        <a
          href="https://konyviro.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline font-medium text-primary"
        >
          KönyvÍró
        </a>
      </footer>

      {/* Global ebook content styles */}
      <style>{`
        .ebook-content p {
          margin-bottom: 0.8em;
          text-indent: 1.5em;
        }
        .ebook-content p:first-child {
          text-indent: 0;
        }
        .ebook-content p:first-child::first-letter {
          font-size: 2.2em;
          font-weight: bold;
          float: left;
          line-height: 1;
          margin-right: 0.08em;
          margin-top: 0.05em;
        }
        .ebook-content blockquote {
          border-left: 3px solid ${theme.muted}40;
          padding-left: 1em;
          margin: 1.2em 0;
          font-style: italic;
          opacity: 0.85;
        }
        .ebook-content h1, .ebook-content h2, .ebook-content h3 {
          text-indent: 0;
          text-align: left;
          margin-top: 1.5em;
          margin-bottom: 0.6em;
        }
        .ebook-content hr {
          border: none;
          text-align: center;
          margin: 2em 0;
        }
        .ebook-content hr::after {
          content: "* * *";
          color: ${theme.muted};
          letter-spacing: 0.5em;
        }
      `}</style>
    </div>
  );
}

function PromoCard({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
          <p className="text-sm font-medium truncate">
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
