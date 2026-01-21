import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if on iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
    
    setIsIOS(isIOSDevice);

    // Don't show if already installed
    if (isInStandaloneMode) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Don't show for 7 days after dismissal
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // For iOS, show custom prompt after delay
    if (isIOSDevice && !isInStandaloneMode) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <Card className="relative overflow-hidden border-2 border-primary/20 bg-card shadow-xl">
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                Hozzáadás a kezdőképernyőhöz
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Telepítsd az alkalmazást a gyorsabb eléréshez és offline használathoz.
              </p>
              {isIOS ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Koppints a <span className="font-medium">Megosztás</span> gombra, majd válaszd a{" "}
                  <span className="font-medium">"Főképernyőhöz adás"</span> lehetőséget.
                </p>
              ) : (
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="mt-3 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Telepítés
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
