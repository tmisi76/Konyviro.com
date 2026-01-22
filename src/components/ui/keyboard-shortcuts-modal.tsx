import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Általános",
    shortcuts: [
      { keys: ["Ctrl", "Q"], description: "Billentyűparancsok megjelenítése" },
      { keys: ["Ctrl", "S"], description: "Mentés" },
      { keys: ["Ctrl", "Z"], description: "Visszavonás" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Mégis" },
      { keys: ["Esc"], description: "Bezárás / Mégse" },
    ],
  },
  {
    title: "Szerkesztő",
    shortcuts: [
      { keys: ["/"], description: "Parancs menü megnyitása" },
      { keys: ["Ctrl", "B"], description: "Félkövér" },
      { keys: ["Ctrl", "I"], description: "Dőlt" },
      { keys: ["Ctrl", "U"], description: "Aláhúzott" },
      { keys: ["#"], description: "Címsor (sor elején)" },
      { keys: ["-"], description: "Lista (sor elején)" },
      { keys: [">"], description: "Idézet (sor elején)" },
    ],
  },
  {
    title: "Navigáció",
    shortcuts: [
      { keys: ["Ctrl", "←"], description: "Előző fejezet" },
      { keys: ["Ctrl", "→"], description: "Következő fejezet" },
      { keys: ["Ctrl", "K"], description: "Gyorskeresés" },
    ],
  },
  {
    title: "AI asszisztens",
    shortcuts: [
      { keys: ["Ctrl", "J"], description: "AI panel megnyitása" },
      { keys: ["Ctrl", "Enter"], description: "Generálás" },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Billentyűparancsok
          </DialogTitle>
          <DialogDescription>
            Gyorsítsd fel a munkádat ezekkel a billentyűparancsokkal
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h4 className="mb-3 text-sm font-semibold text-foreground">
                {group.title}
              </h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd className="rounded bg-background px-2 py-1 text-xs font-mono font-medium text-foreground shadow-sm border">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground text-center">
          Tipp: Mac-en a Ctrl helyett Cmd-et használj
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function useKeyboardShortcuts() {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Q opens shortcuts modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "q") {
        e.preventDefault();
        setShowShortcuts(true);
      }
      // Escape closes modal
      if (e.key === "Escape" && showShortcuts) {
        setShowShortcuts(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showShortcuts]);

  return { showShortcuts, setShowShortcuts };
}
