import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StorybookPage } from "@/types/storybook";

interface FlipBookProps {
  pages: StorybookPage[];
  title: string;
  onPageChange?: (pageIndex: number) => void;
  className?: string;
}

export function FlipBook({ pages, title, onPageChange, className }: FlipBookProps) {
  const [currentSpread, setCurrentSpread] = useState(0); // 0 = cover, 1 = pages 1-2, etc.
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"left" | "right">("right");
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Audio for page flip sound
  const flipSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for page flip sound
    flipSoundRef.current = new Audio("/sounds/page-flip.mp3");
    flipSoundRef.current.volume = 0.3;
    return () => {
      flipSoundRef.current = null;
    };
  }, []);

  const totalSpreads = Math.ceil(pages.length / 2) + 2; // +2 for cover and back

  const playFlipSound = useCallback(() => {
    if (isSoundEnabled && flipSoundRef.current) {
      flipSoundRef.current.currentTime = 0;
      flipSoundRef.current.play().catch(() => {});
    }
  }, [isSoundEnabled]);

  const goToNextSpread = useCallback(() => {
    if (currentSpread < totalSpreads - 1 && !isFlipping) {
      setIsFlipping(true);
      setFlipDirection("right");
      playFlipSound();
      setTimeout(() => {
        setCurrentSpread(prev => prev + 1);
        setIsFlipping(false);
        onPageChange?.(currentSpread * 2);
      }, 400);
    }
  }, [currentSpread, totalSpreads, isFlipping, playFlipSound, onPageChange]);

  const goToPrevSpread = useCallback(() => {
    if (currentSpread > 0 && !isFlipping) {
      setIsFlipping(true);
      setFlipDirection("left");
      playFlipSound();
      setTimeout(() => {
        setCurrentSpread(prev => prev - 1);
        setIsFlipping(false);
        onPageChange?.((currentSpread - 1) * 2);
      }, 400);
    }
  }, [currentSpread, isFlipping, playFlipSound, onPageChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNextSpread();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevSpread();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextSpread, goToPrevSpread]);

  // Get pages for current spread
  const getSpreadPages = (spreadIndex: number) => {
    if (spreadIndex === 0) {
      return { left: null, right: null, isCover: true };
    }
    if (spreadIndex === totalSpreads - 1) {
      return { left: null, right: null, isBack: true };
    }
    
    const pageIndex = (spreadIndex - 1) * 2;
    return {
      left: pages[pageIndex] || null,
      right: pages[pageIndex + 1] || null,
    };
  };

  const currentPages = getSpreadPages(currentSpread);

  // Render a single page
  const renderPage = (page: StorybookPage | null, side: "left" | "right") => {
    if (!page) {
      return (
        <div className={cn(
          "w-full h-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
          "flex items-center justify-center"
        )}>
          <span className="text-muted-foreground/30 text-6xl">📖</span>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full overflow-hidden">
        {/* Illustration */}
        {page.illustrationUrl ? (
          <img
            src={page.illustrationUrl}
            alt={`Oldal ${page.pageNumber}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20" />
        )}

        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
          <p className="text-white text-sm md:text-base lg:text-lg leading-relaxed text-center">
            {page.text}
          </p>
        </div>

        {/* Page number */}
        <div className={cn(
          "absolute bottom-2 text-white/50 text-xs",
          side === "left" ? "left-3" : "right-3"
        )}>
          {page.pageNumber}
        </div>

        {/* Page curl effect */}
        <div className={cn(
          "absolute bottom-0 w-8 h-8 pointer-events-none",
          side === "left" ? "left-0" : "right-0",
          "bg-gradient-to-br from-transparent via-transparent to-black/10"
        )} />
      </div>
    );
  };

  // Render cover
  const renderCover = () => (
    <div className="w-full h-full bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 flex flex-col items-center justify-center p-8 text-white text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <span className="text-6xl md:text-8xl mb-6 block">📚</span>
        <h1 className="text-2xl md:text-4xl font-bold mb-4 drop-shadow-lg">
          {title}
        </h1>
        <p className="text-white/80 text-sm md:text-base">
          Kattints vagy nyomj jobbra a lapozáshoz →
        </p>
      </motion.div>
    </div>
  );

  // Render back cover
  const renderBackCover = () => (
    <div className="w-full h-full bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 flex flex-col items-center justify-center p-8 text-white text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <span className="text-6xl md:text-8xl mb-6 block">✨</span>
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Vége</h2>
        <p className="text-white/80 text-sm md:text-base">
          Köszönjük, hogy velünk olvastál!
        </p>
        <p className="text-white/60 text-xs mt-4">
          Készült az InkStory segítségével
        </p>
      </motion.div>
    </div>
  );

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full max-w-5xl mx-auto select-none",
        className
      )}
    >
      {/* Book container */}
      <div 
        className="relative aspect-[16/10] md:aspect-[2/1] perspective-[2000px]"
        onClick={(e) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const clickX = e.clientX - rect.left;
            if (clickX < rect.width / 2) {
              goToPrevSpread();
            } else {
              goToNextSpread();
            }
          }
        }}
      >
        {/* Book shadow */}
        <div className="absolute inset-x-4 bottom-0 h-4 bg-black/20 blur-xl rounded-full" />

        {/* Book spine */}
        <div className="absolute left-1/2 top-0 bottom-0 w-4 -ml-2 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 z-10 shadow-lg" />

        {/* Left page */}
        <motion.div
          className={cn(
            "absolute left-0 top-0 w-1/2 h-full origin-right",
            "bg-white dark:bg-gray-900 rounded-l-lg overflow-hidden shadow-xl"
          )}
          style={{
            transformStyle: "preserve-3d",
          }}
          animate={{
            rotateY: isFlipping && flipDirection === "left" ? -15 : 0,
          }}
          transition={{ duration: 0.4 }}
        >
          {currentPages.isCover ? (
            renderCover()
          ) : currentPages.isBack ? (
            renderBackCover()
          ) : (
            renderPage(currentPages.left, "left")
          )}
        </motion.div>

        {/* Right page */}
        <motion.div
          className={cn(
            "absolute right-0 top-0 w-1/2 h-full origin-left",
            "bg-white dark:bg-gray-900 rounded-r-lg overflow-hidden shadow-xl"
          )}
          style={{
            transformStyle: "preserve-3d",
          }}
          animate={{
            rotateY: isFlipping && flipDirection === "right" ? 15 : 0,
          }}
          transition={{ duration: 0.4 }}
        >
          {currentPages.isCover ? (
            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center">
              <p className="text-muted-foreground text-center p-8">
                Ez a történet rólad szól...
              </p>
            </div>
          ) : currentPages.isBack ? (
            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20" />
          ) : (
            renderPage(currentPages.right, "right")
          )}
        </motion.div>

        {/* Page flip animation overlay */}
        <AnimatePresence>
          {isFlipping && (
            <motion.div
              initial={{ 
                rotateY: flipDirection === "right" ? 0 : -180,
                x: flipDirection === "right" ? "0%" : "-100%",
              }}
              animate={{ 
                rotateY: flipDirection === "right" ? -180 : 0,
                x: flipDirection === "right" ? "-100%" : "0%",
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                "absolute top-0 w-1/2 h-full origin-right z-20",
                flipDirection === "right" ? "right-0" : "left-0",
                "bg-white dark:bg-gray-900 shadow-2xl"
              )}
              style={{
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between mt-6 px-4">
        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            goToPrevSpread();
          }}
          disabled={currentSpread === 0 || isFlipping}
          className="rounded-full"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSpreads }).map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (!isFlipping && i !== currentSpread) {
                  setCurrentSpread(i);
                }
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === currentSpread
                  ? "w-6 bg-primary"
                  : "bg-muted hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsSoundEnabled(!isSoundEnabled);
            }}
            className="rounded-full"
          >
            {isSoundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              goToNextSpread();
            }}
            disabled={currentSpread === totalSpreads - 1 || isFlipping}
            className="rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Page counter */}
      <div className="text-center mt-2 text-sm text-muted-foreground">
        {currentSpread === 0 
          ? "Borító" 
          : currentSpread === totalSpreads - 1 
            ? "Vége" 
            : `${(currentSpread - 1) * 2 + 1}-${Math.min((currentSpread - 1) * 2 + 2, pages.length)} / ${pages.length} oldal`
        }
      </div>
    </div>
  );
}
