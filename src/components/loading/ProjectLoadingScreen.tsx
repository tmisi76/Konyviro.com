import { useState, useEffect, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const FUNNY_MESSAGES = [
  "Éppen az utolsó szavakat írom...",
  "Pár pillanat és mutatok egy bestsellert...",
  "Türelem bestsellert terem...",
  "A múzsa épp ihletért megy...",
  "Kávét főzök a karaktereknek...",
  "Fejezetek rendezése folyamatban...",
  "Az író még a tollát keresi...",
  "Kreatív energia töltése...",
  "A történet szálait bogozom...",
  "Még gyorsan átolvasom a végét...",
];

const DURATION_MS = 3000;
const MESSAGE_INTERVAL_MS = 600;

interface ProjectLoadingScreenProps {
  projectTitle?: string;
  onComplete: () => void;
}

export function ProjectLoadingScreen({ projectTitle, onComplete }: ProjectLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  // Get random message that's different from current
  const getRandomMessage = useCallback((excludeMessage: string) => {
    const availableMessages = FUNNY_MESSAGES.filter((msg) => msg !== excludeMessage);
    return availableMessages[Math.floor(Math.random() * availableMessages.length)];
  }, []);

  useEffect(() => {
    // Set initial message
    setCurrentMessage(FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]);

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const increment = 100 / (DURATION_MS / 50);
        return Math.min(prev + increment, 100);
      });
    }, 50);

    // Message rotation
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => getRandomMessage(prev));
    }, MESSAGE_INTERVAL_MS);

    // Complete after duration
    const completeTimeout = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 300);
    }, DURATION_MS);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      clearTimeout(completeTimeout);
    };
  }, [onComplete, getRandomMessage]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-300",
        isExiting ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
          <span className="text-3xl font-bold text-primary-foreground">K</span>
        </div>
        <span className="text-3xl font-bold text-foreground">KönyvÍró</span>
      </div>

      {/* Project title (optional) */}
      {projectTitle && (
        <h2 className="mb-6 text-xl font-medium text-muted-foreground">
          {projectTitle}
        </h2>
      )}

      {/* Progress bar */}
      <div className="mb-6 w-full max-w-md px-6">
        <Progress value={progress} className="h-3" />
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {Math.round(progress)}%
        </p>
      </div>

      {/* Funny message */}
      <p
        key={currentMessage}
        className="animate-fade-in text-center text-lg italic text-muted-foreground"
      >
        "{currentMessage}"
      </p>
    </div>
  );
}
