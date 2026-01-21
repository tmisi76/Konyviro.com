import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    target: "[data-tour='sidebar']",
    title: "Projektek és navigáció",
    description: "Itt találod az összes projektedet és gyorsan válthatsz közöttük.",
    position: "right",
  },
  {
    target: "[data-tour='editor']",
    title: "Szerkesztő",
    description: "A fő szerkesztő terület, ahol a könyved tartalmát írod. Használd a '/' parancsot a formázáshoz!",
    position: "left",
  },
  {
    target: "[data-tour='ai-panel']",
    title: "AI asszisztens",
    description: "Az AI segít írni, javítani és ötleteket generálni. Csak kérdezz!",
    position: "left",
  },
  {
    target: "[data-tour='chapters']",
    title: "Fejezetek",
    description: "Rendezd a könyved fejezetekbe. Húzd őket az átrendezéshez!",
    position: "right",
  },
];

const TOUR_STORAGE_KEY = "konyviro-onboarding-completed";

interface OnboardingTourProps {
  onComplete?: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const hasCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!hasCompleted) {
      // Small delay to allow page to render
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const step = tourSteps[currentStep];
    const element = document.querySelector(step.target);

    if (element) {
      const rect = element.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (step.position) {
        case "right":
          top = rect.top + rect.height / 2 - 60;
          left = rect.right + 16;
          break;
        case "left":
          top = rect.top + rect.height / 2 - 60;
          left = rect.left - 320;
          break;
        case "bottom":
          top = rect.bottom + 16;
          left = rect.left + rect.width / 2 - 150;
          break;
        case "top":
        default:
          top = rect.top - 140;
          left = rect.left + rect.width / 2 - 150;
          break;
      }

      // Clamp to viewport
      top = Math.max(16, Math.min(top, window.innerHeight - 200));
      left = Math.max(16, Math.min(left, window.innerWidth - 320));

      setTooltipPosition({ top, left });

      // Highlight element
      element.classList.add("ring-2", "ring-primary", "ring-offset-2", "relative", "z-50");

      return () => {
        element.classList.remove("ring-2", "ring-primary", "ring-offset-2", "relative", "z-50");
      };
    }
  }, [currentStep, isVisible]);

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    }
    setIsVisible(false);
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    }
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) return null;

  const step = tourSteps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />

      {/* Tooltip */}
      <div
        className="fixed z-50 w-[300px] rounded-xl bg-card p-4 shadow-xl border animate-scale-in"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute right-2 top-2 p-1 rounded-md hover:bg-muted"
          aria-label="Bezárás"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <h4 className="mb-1 font-semibold text-foreground">{step.title}</h4>
        <p className="mb-4 text-sm text-muted-foreground">{step.description}</p>

        {/* Progress */}
        <div className="mb-4 flex gap-1">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                index <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Don't show again */}
        <div className="mb-4 flex items-center gap-2">
          <Checkbox
            id="dont-show"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
          />
          <label htmlFor="dont-show" className="text-xs text-muted-foreground cursor-pointer">
            Ne mutasd újra
          </label>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Előző
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {tourSteps.length}
          </span>
          <Button size="sm" onClick={handleNext}>
            {currentStep === tourSteps.length - 1 ? "Befejezés" : "Következő"}
            {currentStep < tourSteps.length - 1 && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}

export function resetOnboardingTour() {
  localStorage.removeItem(TOUR_STORAGE_KEY);
}
