import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSharedBook } from "@/hooks/useBookShare";
import { PasswordGate } from "@/components/reader/PasswordGate";
import { BookScrollView } from "@/components/reader/BookScrollView";
import { BookFlipView } from "@/components/reader/BookFlipView";
import { ReaderViewToggle } from "@/components/reader/ReaderViewToggle";

export default function PublicBookReader() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { data, isLoading, error, needsPassword, verifyPassword } = useSharedBook(shareToken || "");
  const [viewMode, setViewMode] = useState<"scroll" | "flipbook">("scroll");

  // Set initial view mode from share settings
  useEffect(() => {
    if (data?.share?.view_mode) {
      setViewMode(data.share.view_mode);
    }
  }, [data?.share?.view_mode]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Könyv betöltése...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
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

  // Password check
  if (needsPassword) {
    return (
      <PasswordGate
        bookTitle={data.project.title}
        onVerify={verifyPassword}
      />
    );
  }

  const { project, chapters } = data;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold truncate max-w-[200px] md:max-w-md">
              {project.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <ReaderViewToggle value={viewMode} onChange={setViewMode} />
            
            {data.share.allow_download && (
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Letöltés</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        {viewMode === "scroll" ? (
          <BookScrollView
            title={project.title}
            chapters={chapters}
            className="min-h-[calc(100vh-3.5rem)]"
          />
        ) : (
          <BookFlipView
            title={project.title}
            chapters={chapters}
            className="min-h-[calc(100vh-3.5rem)]"
          />
        )}
      </main>
    </div>
  );
}
