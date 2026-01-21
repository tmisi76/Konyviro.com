import { useState, useEffect } from "react";
import { Download, Smartphone, Monitor, Check, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsInstalled(isStandalone);

    // Check if iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Vissza</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          {/* Hero */}
          <div className="mb-8">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Smartphone className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Telepítsd a KönyvÍró AI-t
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Gyorsabb elérés, offline használat, teljes képernyős élmény.
            </p>
          </div>

          {/* Status Card */}
          {isInstalled ? (
            <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <CardContent className="flex items-center justify-center gap-3 py-8">
                <Check className="h-6 w-6 text-green-600" />
                <span className="text-lg font-medium text-green-700 dark:text-green-400">
                  Az alkalmazás már telepítve van!
                </span>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Android / Desktop */}
              {!isIOS && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                      <Monitor className="h-5 w-5" />
                      Telepítés
                    </CardTitle>
                    <CardDescription>
                      Egy kattintással hozzáadhatod a kezdőképernyőhöz
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={handleInstall}
                      disabled={!deferredPrompt}
                      size="lg"
                      className="w-full gap-2"
                    >
                      <Download className="h-5 w-5" />
                      Telepítés most
                    </Button>
                    {!deferredPrompt && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        A telepítés gomb csak kompatibilis böngészőkben jelenik meg.
                        Próbáld Chrome-ban vagy Edge-ben.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* iOS Instructions */}
              {isIOS && (
                <Card>
                  <CardHeader>
                    <CardTitle>Telepítés iPhone-ra / iPadre</CardTitle>
                    <CardDescription>
                      Kövesd az alábbi lépéseket
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-left">
                    <ol className="space-y-4">
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          1
                        </span>
                        <span>
                          Koppints a <strong>Megosztás</strong> gombra (négyzet nyíllal) az alső menüsorban
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          2
                        </span>
                        <span>
                          Görgess le és válaszd a <strong>"Főképernyőhöz adás"</strong> lehetőséget
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          3
                        </span>
                        <span>
                          Koppints a <strong>"Hozzáadás"</strong> gombra a jobb felső sarokban
                        </span>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              )}

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Miért érdemes telepíteni?</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-left">
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>Gyorsabb indulás a kezdőképernyőről</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>Teljes képernyős élmény böngészősáv nélkül</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>Offline hozzáférés a projektjeidhez</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>Értesítések (hamarosan)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
