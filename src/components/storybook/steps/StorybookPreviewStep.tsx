import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Save,
  RefreshCw,
  Edit3,
  Check,
  X,
  Loader2,
  BookOpen,
  Maximize2,
  ImageOff,
} from "lucide-react";
import { StorybookData, StorybookPage } from "@/types/storybook";
import { StorybookExport } from "../StorybookExport";
import { cn } from "@/lib/utils";

interface StorybookPreviewStepProps {
  data: StorybookData;
  onUpdatePage: (pageId: string, updates: Partial<StorybookPage>) => void;
  onRegenerateIllustration: (pageId: string) => Promise<boolean>;
  onRegenerateMissingIllustrations?: () => Promise<boolean>;
  onSave: () => Promise<string | null>;
  onExport: () => void;
  isSaving: boolean;
}

export function StorybookPreviewStep({
  data,
  onUpdatePage,
  onRegenerateIllustration,
  onRegenerateMissingIllustrations,
  onSave,
  onExport,
  isSaving,
}: StorybookPreviewStepProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [regeneratingPage, setRegeneratingPage] = useState<string | null>(null);
  const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const pages = data.pages;
  const totalPages = pages.length;
  const page = pages[currentPage];
  
  // Count missing illustrations
  const missingIllustrations = pages.filter(p => !p.illustrationUrl).length;

  const goToPage = (index: number) => {
    if (index >= 0 && index < totalPages) {
      setCurrentPage(index);
      setIsEditing(false);
    }
  };

  const handlePrevPage = () => goToPage(currentPage - 1);
  const handleNextPage = () => goToPage(currentPage + 1);

  const handleStartEdit = () => {
    setEditText(page?.text || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (page) {
      onUpdatePage(page.id, { text: editText });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleRegenerateIllustration = async () => {
    if (!page) return;
    setRegeneratingPage(page.id);
    await onRegenerateIllustration(page.id);
    setRegeneratingPage(null);
  };

  const handleRegenerateMissingIllustrations = async () => {
    if (!onRegenerateMissingIllustrations) return;
    setIsRegeneratingAll(true);
    await onRegenerateMissingIllustrations();
    setIsRegeneratingAll(false);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrevPage();
    if (e.key === "ArrowRight") handleNextPage();
    if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
  }, [currentPage, isFullscreen]);

  // Book spread view (two pages side by side)
  const renderBookSpread = () => {
    const leftPage = currentPage % 2 === 0 ? pages[currentPage] : pages[currentPage - 1];
    const rightPage = currentPage % 2 === 0 ? pages[currentPage + 1] : pages[currentPage];
    
    return (
      <div className="flex gap-1 perspective-1000">
        {/* Left page */}
        <motion.div
          initial={{ rotateY: -10 }}
          animate={{ rotateY: 0 }}
          className="flex-1 bg-white dark:bg-gray-900 rounded-l-lg shadow-xl overflow-hidden"
          style={{ transformStyle: "preserve-3d" }}
        >
          {leftPage && (
            <div className="aspect-[3/4] relative">
              {leftPage.illustrationUrl ? (
                <img
                  src={leftPage.illustrationUrl}
                  alt={`Oldal ${leftPage.pageNumber}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-amber-400/50" />
                </div>
              )}
              {/* Text overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-sm md:text-base leading-relaxed">
                  {leftPage.text}
                </p>
              </div>
              {/* Page number */}
              <div className="absolute bottom-2 left-4 text-white/60 text-xs">
                {leftPage.pageNumber}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right page */}
        <motion.div
          initial={{ rotateY: 10 }}
          animate={{ rotateY: 0 }}
          className="flex-1 bg-white dark:bg-gray-900 rounded-r-lg shadow-xl overflow-hidden"
          style={{ transformStyle: "preserve-3d" }}
        >
          {rightPage && (
            <div className="aspect-[3/4] relative">
              {rightPage.illustrationUrl ? (
                <img
                  src={rightPage.illustrationUrl}
                  alt={`Oldal ${rightPage.pageNumber}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-amber-400/50" />
                </div>
              )}
              {/* Text overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-sm md:text-base leading-relaxed">
                  {rightPage.text}
                </p>
              </div>
              {/* Page number */}
              <div className="absolute bottom-2 right-4 text-white/60 text-xs">
                {rightPage.pageNumber}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  };

  // Single page view for mobile
  const renderSinglePage = () => {
    if (!page) return null;

    return (
      <motion.div
        key={currentPage}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden max-w-lg mx-auto"
      >
        <div className="aspect-[3/4] relative">
          {/* Illustration */}
          {regeneratingPage === page.id ? (
            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
              <p className="text-amber-600 dark:text-amber-400">Új illusztráció készül...</p>
            </div>
          ) : page.illustrationUrl ? (
            <img
              src={page.illustrationUrl}
              alt={`Oldal ${page.pageNumber}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center">
              <BookOpen className="w-16 h-16 text-amber-400/50" />
            </div>
          )}

          {/* Text overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
                  placeholder="Írd be a szöveget..."
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="text-white hover:bg-white/20">
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} className="bg-white/20 hover:bg-white/30 text-white">
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-white text-lg leading-relaxed">
                {page.text}
              </p>
            )}
          </div>

          {/* Page number */}
          <div className="absolute top-4 right-4 bg-black/30 text-white text-sm px-3 py-1 rounded-full">
            {page.pageNumber} / {totalPages}
          </div>

          {/* Edit button */}
          {!isEditing && (
            <button
              onClick={handleStartEdit}
              className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div 
      className={cn(
        "flex flex-col",
        isFullscreen ? "fixed inset-0 z-50 bg-background" : "min-h-[60vh]"
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-bold">{data.title}</h2>
        <div className="flex items-center gap-2">
          {/* Missing illustrations warning button */}
          {missingIllustrations > 0 && onRegenerateMissingIllustrations && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateMissingIllustrations}
              disabled={isRegeneratingAll || regeneratingPage !== null}
              className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              {isRegeneratingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageOff className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Hiányzó képek ({missingIllustrations})</span>
              <span className="sm:hidden">{missingIllustrations}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateIllustration}
            disabled={regeneratingPage !== null || isRegeneratingAll}
          >
            <RefreshCw className={cn("w-4 h-4", regeneratingPage && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </Button>
          <Button size="sm" onClick={() => setShowExportModal(true)} className="gap-2">
            <Download className="w-4 h-4" />
            Exportálás
          </Button>
        </div>
      </div>

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mesekönyv exportálása</DialogTitle>
          </DialogHeader>
          <StorybookExport 
            data={data} 
            projectId={data.projectId || ""} 
          />
        </DialogContent>
      </Dialog>

      {/* Book preview */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-gradient-to-b from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10">
        <div className="w-full max-w-4xl">
          {/* Desktop: Book spread view */}
          <div className="hidden md:block">
            {renderBookSpread()}
          </div>
          
          {/* Mobile: Single page view */}
          <div className="md:hidden">
            <AnimatePresence mode="wait">
              {renderSinglePage()}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 p-4 border-t bg-background">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevPage}
          disabled={currentPage === 0}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Page indicators */}
        <div className="flex items-center gap-1">
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToPage(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentPage
                  ? "w-6 bg-primary"
                  : "bg-muted hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Thumbnail strip */}
      <div className="p-4 border-t bg-muted/30 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {pages.map((p, index) => (
            <button
              key={p.id}
              onClick={() => goToPage(index)}
              className={cn(
                "w-16 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                index === currentPage
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-primary/50"
              )}
            >
              {p.illustrationUrl ? (
                <img
                  src={p.illustrationUrl}
                  alt={`Oldal ${p.pageNumber}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">{p.pageNumber}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
