import { useState, useEffect } from "react";
import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface ReaderSettingsState {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  theme: "white" | "sepia" | "dark";
}

const STORAGE_KEY = "reader_settings";

const defaultSettings: ReaderSettingsState = {
  fontFamily: "Georgia, serif",
  fontSize: 18,
  lineHeight: 1.6,
  theme: "white",
};

const fonts = [
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Sans", value: "Inter, system-ui, sans-serif" },
  { label: "Mono", value: "'JetBrains Mono', 'Courier New', monospace" },
];

const spacings = [
  { label: "Szűk", value: 1.4 },
  { label: "Normál", value: 1.6 },
  { label: "Tágas", value: 2.0 },
];

export const themeStyles = {
  white: { bg: "#ffffff", text: "#1a1a1a", muted: "#6b7280" },
  sepia: { bg: "#f4ecd8", text: "#3d3229", muted: "#7a6e5d" },
  dark: { bg: "#1a1a2e", text: "#e0e0e0", muted: "#8888a0" },
};

export function loadReaderSettings(): ReaderSettingsState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {}
  return defaultSettings;
}

function saveReaderSettings(s: ReaderSettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface ReaderSettingsProps {
  settings: ReaderSettingsState;
  onChange: (s: ReaderSettingsState) => void;
}

export function ReaderSettings({ settings, onChange }: ReaderSettingsProps) {
  const update = (partial: Partial<ReaderSettingsState>) => {
    const next = { ...settings, ...partial };
    onChange(next);
    saveReaderSettings(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Type className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Aa</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-4" align="end">
        {/* Font family */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Betűtípus</p>
          <div className="flex gap-1">
            {fonts.map((f) => (
              <button
                key={f.label}
                onClick={() => update({ fontFamily: f.value })}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
                  settings.fontFamily === f.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font size */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Betűméret</p>
            <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">A</span>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([v]) => update({ fontSize: v })}
              min={14}
              max={28}
              step={1}
              className="flex-1"
            />
            <span className="text-base font-bold text-muted-foreground">A</span>
          </div>
        </div>

        {/* Line spacing */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sortávolság</p>
          <div className="flex gap-1">
            {spacings.map((s) => (
              <button
                key={s.label}
                onClick={() => update({ lineHeight: s.value })}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
                  settings.lineHeight === s.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Háttér</p>
          <div className="flex gap-2">
            {(Object.keys(themeStyles) as Array<keyof typeof themeStyles>).map((key) => {
              const t = themeStyles[key];
              const labels = { white: "Fehér", sepia: "Szépia", dark: "Sötét" };
              return (
                <button
                  key={key}
                  onClick={() => update({ theme: key })}
                  className={cn(
                    "flex-1 rounded-md border px-2 py-2 text-xs transition-all",
                    settings.theme === key
                      ? "ring-2 ring-primary ring-offset-1"
                      : "hover:scale-105"
                  )}
                  style={{ backgroundColor: t.bg, color: t.text, borderColor: t.muted + "40" }}
                >
                  {labels[key]}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
