import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon, Sun, Eye } from "lucide-react";

const HIGH_CONTRAST_KEY = "konyviro-high-contrast";

export function AccessibilitySettings() {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(HIGH_CONTRAST_KEY);
    if (stored === "true") {
      setHighContrast(true);
      document.documentElement.classList.add("high-contrast");
    }
  }, []);

  const handleHighContrastChange = (enabled: boolean) => {
    setHighContrast(enabled);
    localStorage.setItem(HIGH_CONTRAST_KEY, enabled.toString());
    if (enabled) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5 text-muted-foreground" />
          <div>
            <Label htmlFor="high-contrast" className="text-sm font-medium">
              Magas kontraszt mód
            </Label>
            <p className="text-xs text-muted-foreground">
              Javított olvashatóság gyengénlátók számára
            </p>
          </div>
        </div>
        <Switch
          id="high-contrast"
          checked={highContrast}
          onCheckedChange={handleHighContrastChange}
          aria-label="Magas kontraszt mód bekapcsolása"
        />
      </div>
    </div>
  );
}

// Skip to main content link component
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Ugrás a tartalomhoz
    </a>
  );
}

// Live region for screen reader announcements
export function LiveRegion({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
