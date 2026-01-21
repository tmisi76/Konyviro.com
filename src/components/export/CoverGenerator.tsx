import { useState, useRef } from "react";
import { Image, Download, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CoverSettings } from "@/types/export";

interface CoverGeneratorProps {
  projectTitle: string;
  authorName?: string;
  onCoverGenerated?: (coverDataUrl: string) => void;
}

const PRESET_COLORS = [
  "#1a1a2e",
  "#16213e",
  "#0f3460",
  "#533483",
  "#2c3e50",
  "#1e272e",
  "#2d3436",
  "#d35400",
  "#c0392b",
  "#27ae60",
];

export function CoverGenerator({
  projectTitle,
  authorName = "",
  onCoverGenerated,
}: CoverGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<CoverSettings>({
    backgroundColor: "#1a1a2e",
    titleText: projectTitle,
    authorName: authorName,
    titleColor: "#ffffff",
    authorColor: "#a0a0a0",
    titleFontSize: 48,
    authorFontSize: 24,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const updateSetting = <K extends keyof CoverSettings>(
    key: K,
    value: CoverSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const renderCover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Standard book cover size (6x9 ratio)
    canvas.width = 600;
    canvas.height = 900;

    // Background
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = settings.titleColor;
    ctx.font = `bold ${settings.titleFontSize}px Merriweather, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Word wrap title
    const maxWidth = canvas.width - 80;
    const words = settings.titleText.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = settings.titleFontSize * 1.2;
    const titleStartY = canvas.height * 0.35 - (lines.length * lineHeight) / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, canvas.width / 2, titleStartY + i * lineHeight);
    });

    // Author name
    if (settings.authorName) {
      ctx.fillStyle = settings.authorColor;
      ctx.font = `${settings.authorFontSize}px Merriweather, serif`;
      ctx.fillText(settings.authorName, canvas.width / 2, canvas.height * 0.75);
    }

    // Decorative line
    ctx.strokeStyle = settings.titleColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.2, canvas.height * 0.55);
    ctx.lineTo(canvas.width * 0.8, canvas.height * 0.55);
    ctx.stroke();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderCover();

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${settings.titleText.replace(/\s+/g, "_")}_cover.png`;
    link.href = dataUrl;
    link.click();

    if (onCoverGenerated) {
      onCoverGenerated(dataUrl);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Image className="h-4 w-4" />
          Borító készítése
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Borító készítése</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Preview */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative flex h-[450px] w-[300px] flex-col items-center justify-center rounded-lg shadow-lg"
              style={{ backgroundColor: settings.backgroundColor }}
            >
              <div
                className="px-6 text-center font-serif"
                style={{
                  color: settings.titleColor,
                  fontSize: `${settings.titleFontSize / 2}px`,
                  fontWeight: "bold",
                }}
              >
                {settings.titleText || "Könyv címe"}
              </div>

              <div
                className="absolute bottom-20 text-center font-serif"
                style={{
                  color: settings.authorColor,
                  fontSize: `${settings.authorFontSize / 2}px`,
                }}
              >
                {settings.authorName || "Szerző neve"}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Settings */}
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-sm">Cím</Label>
              <Input
                value={settings.titleText}
                onChange={(e) => updateSetting("titleText", e.target.value)}
                placeholder="Könyv címe"
              />
            </div>

            {/* Author */}
            <div className="space-y-2">
              <Label className="text-sm">Szerző</Label>
              <Input
                value={settings.authorName}
                onChange={(e) => updateSetting("authorName", e.target.value)}
                placeholder="Szerző neve"
              />
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <Label className="text-sm">Háttérszín</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateSetting("backgroundColor", color)}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      settings.backgroundColor === color
                        ? "border-primary scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => updateSetting("backgroundColor", e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>

            {/* Title Font Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Cím mérete</Label>
                <span className="text-xs text-muted-foreground">
                  {settings.titleFontSize}px
                </span>
              </div>
              <Slider
                value={[settings.titleFontSize]}
                onValueChange={([value]) => updateSetting("titleFontSize", value)}
                min={24}
                max={72}
                step={2}
              />
            </div>

            {/* Author Font Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Szerző neve mérete</Label>
                <span className="text-xs text-muted-foreground">
                  {settings.authorFontSize}px
                </span>
              </div>
              <Slider
                value={[settings.authorFontSize]}
                onValueChange={([value]) => updateSetting("authorFontSize", value)}
                min={14}
                max={36}
                step={2}
              />
            </div>

            {/* Text Colors */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-sm">Cím színe</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.titleColor}
                    onChange={(e) => updateSetting("titleColor", e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border-0"
                  />
                  <span className="text-xs text-muted-foreground">
                    {settings.titleColor}
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-sm">Szerző színe</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.authorColor}
                    onChange={(e) => updateSetting("authorColor", e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border-0"
                  />
                  <span className="text-xs text-muted-foreground">
                    {settings.authorColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <Button onClick={handleDownload} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Borító letöltése
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
