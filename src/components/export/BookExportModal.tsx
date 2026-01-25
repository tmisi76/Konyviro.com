import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";
import {
  EXPORT_FORMATS,
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_EXPORT_METADATA,
  EXPORT_LIMITS,
  type ExportFormat,
  type ExportSettings,
  type ExportMetadata,
  type FontFamily,
  type FontSize,
  type LineSpacing,
  type PageSize,
  type MarginStyle,
} from "@/types/export";

interface BookExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  authorName?: string;
  coverUrl?: string;
}

type ExportState = "idle" | "processing" | "completed" | "error";

interface ExportProgress {
  state: ExportState;
  message: string;
  progress?: number;
  fileUrl?: string;
  fileSize?: number;
  fileName?: string;
  error?: string;
}

export function BookExportModal({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  authorName = "",
  coverUrl,
}: BookExportModalProps) {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const tier = subscription?.tier || "free";

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("epub");
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [metadata, setMetadata] = useState<ExportMetadata>(DEFAULT_EXPORT_METADATA);
  const [useCover, setUseCover] = useState(!!coverUrl);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    state: "idle",
    message: "",
  });
  const [monthlyExports, setMonthlyExports] = useState(0);

  const exportLimit = EXPORT_LIMITS[tier] ?? 2;
  const hasUnlimitedExports = exportLimit === -1;
  const remainingExports = hasUnlimitedExports ? Infinity : exportLimit - monthlyExports;
  const canExport = hasUnlimitedExports || remainingExports > 0;

  // Fetch monthly export count
  useEffect(() => {
    if (!user || !open) return;

    const fetchExportCount = async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("exports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString())
        .eq("status", "completed");

      setMonthlyExports(count || 0);
    };

    fetchExportCount();
  }, [user, open]);

  const updateSetting = <K extends keyof ExportSettings>(
    key: K,
    value: ExportSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateMetadata = <K extends keyof ExportMetadata>(
    key: K,
    value: ExportMetadata[K]
  ) => {
    setMetadata((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    if (!canExport) {
      toast({
        title: "Exportálási limit elérve",
        description: "Frissítsd az előfizetésedet több exportáláshoz.",
        variant: "destructive",
      });
      return;
    }

    setExportProgress({ state: "processing", message: "Fejezetek összegyűjtése..." });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Nincs bejelentkezve");
      }

      // Call export edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-book`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId,
            format: selectedFormat,
            settings,
            metadata: {
              ...metadata,
              title: projectTitle,
              author: authorName,
            },
            useCover,
            coverUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      // All formats use CloudConvert - get job ID and poll for completion
      const { jobId, exportId } = await response.json();
      
      setExportProgress({ 
        state: "processing", 
        message: "Konvertálás folyamatban...", 
        progress: 30 
      });
      
      // Poll for completion (works for epub, pdf, mobi, docx)
      await pollExportStatus(exportId, jobId);
    } catch (error: any) {
      console.error("Export error:", error);
      setExportProgress({
        state: "error",
        message: "Hiba történt az exportálás során",
        error: error.message || "Ismeretlen hiba",
      });
    }
  };

  const pollExportStatus = async (exportId: string, jobId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-status`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ exportId, jobId }),
          }
        );

        const data = await response.json();

        if (data.status === "completed") {
          setExportProgress({
            state: "completed",
            message: "Exportálás kész!",
            fileUrl: data.fileUrl,
            fileSize: data.fileSize,
            fileName: data.fileName,
          });
          return;
        }

        if (data.status === "failed") {
          throw new Error(data.error || "Konvertálás sikertelen");
        }

        // Still processing
        const progress = Math.min(30 + (attempts / maxAttempts) * 60, 90);
        setExportProgress({
          state: "processing",
          message: "Konvertálás folyamatban...",
          progress,
        });

        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          throw new Error("Időtúllépés a konvertálás során");
        }
      } catch (error: any) {
        setExportProgress({
          state: "error",
          message: "Hiba történt az exportálás során",
          error: error.message,
        });
      }
    };

    poll();
  };

  const handleDownload = () => {
    if (exportProgress.fileUrl && exportProgress.fileName) {
      const a = document.createElement("a");
      a.href = exportProgress.fileUrl;
      a.download = exportProgress.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleReset = () => {
    setExportProgress({ state: "idle", message: "" });
  };

  const handleClose = () => {
    if (exportProgress.state === "processing") {
      return; // Don't close while processing
    }
    handleReset();
    onOpenChange(false);
  };

  const showTypographySettings = selectedFormat === "epub" || selectedFormat === "pdf";
  const showPageSettings = selectedFormat === "pdf";

  // Render different states
  if (exportProgress.state === "processing") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Exportálás folyamatban</h3>
              <p className="text-muted-foreground">{exportProgress.message}</p>
            </div>
            {exportProgress.progress !== undefined && (
              <Progress value={exportProgress.progress} className="w-64" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (exportProgress.state === "completed") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Exportálás kész!</h3>
              <p className="text-muted-foreground">
                {exportProgress.fileName}
                {exportProgress.fileSize && (
                  <span className="ml-2">
                    ({(exportProgress.fileSize / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button onClick={handleDownload} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Letöltés
              </Button>
              <Button variant="outline" disabled className="w-full">
                Küldés emailben
                <Badge variant="secondary" className="ml-2 text-xs">
                  Hamarosan
                </Badge>
              </Button>
              <Button variant="ghost" onClick={handleReset} className="w-full">
                Új exportálás
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (exportProgress.state === "error") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Hiba történt az exportálás során</h3>
              <p className="text-muted-foreground text-sm">{exportProgress.error}</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button onClick={handleReset} className="w-full">
                Próbáld újra
              </Button>
              <Button variant="ghost" asChild className="w-full">
                <a href="mailto:support@konyviro.ai">Támogatás</a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Könyv exportálása</DialogTitle>
          <p className="text-sm text-muted-foreground line-clamp-1">{projectTitle}</p>
        </DialogHeader>

        {/* Export limit info */}
        {!hasUnlimitedExports && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            Hátralévő exportálások ebben a hónapban:{" "}
            <span className="font-medium text-foreground">
              {remainingExports}/{exportLimit}
            </span>
          </div>
        )}

        {/* Format selection */}
        <div className="grid grid-cols-2 gap-3">
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(format.id)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-4 text-center transition-all hover:border-primary/50",
                selectedFormat === format.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-muted/50"
              )}
            >
              {format.recommended && (
                <Badge
                  variant="default"
                  className="absolute -top-2 -right-2 text-xs px-1.5 py-0"
                >
                  Ajánlott
                </Badge>
              )}
              <span className="text-2xl">{format.icon}</span>
              <span className="font-medium">{format.name}</span>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {format.description}
              </span>
            </button>
          ))}
        </div>

        {/* Export settings */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              Exportálási beállítások
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  settingsOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {/* Basic toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="title-page">Címoldal hozzáadása</Label>
                <Switch
                  id="title-page"
                  checked={settings.includeTitlePage}
                  onCheckedChange={(v) => updateSetting("includeTitlePage", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="toc">Tartalomjegyzék</Label>
                <Switch
                  id="toc"
                  checked={settings.includeTableOfContents}
                  onCheckedChange={(v) => updateSetting("includeTableOfContents", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="chapter-numbers">Fejezetek számozása</Label>
                <Switch
                  id="chapter-numbers"
                  checked={settings.includeChapterNumbers}
                  onCheckedChange={(v) => updateSetting("includeChapterNumbers", v)}
                />
              </div>
            </div>

            {/* Typography settings */}
            {showTypographySettings && (
              <div className="space-y-3 pt-2 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Betűtípus</Label>
                    <Select
                      value={settings.fontFamily}
                      onValueChange={(v) => updateSetting("fontFamily", v as FontFamily)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Merriweather">Merriweather</SelectItem>
                        <SelectItem value="PT Serif">PT Serif</SelectItem>
                        <SelectItem value="Literata">Literata</SelectItem>
                        <SelectItem value="Open Sans">Open Sans</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Betűméret</Label>
                    <Select
                      value={settings.fontSize}
                      onValueChange={(v) => updateSetting("fontSize", v as FontSize)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="11pt">11pt</SelectItem>
                        <SelectItem value="12pt">12pt</SelectItem>
                        <SelectItem value="14pt">14pt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sorköz</Label>
                  <Select
                    value={settings.lineSpacing}
                    onValueChange={(v) => updateSetting("lineSpacing", v as LineSpacing)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.2">1.2</SelectItem>
                      <SelectItem value="1.5">1.5</SelectItem>
                      <SelectItem value="1.8">1.8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Page settings for PDF */}
            {showPageSettings && (
              <div className="space-y-3 pt-2 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Oldalméret</Label>
                    <Select
                      value={settings.pageSize}
                      onValueChange={(v) => updateSetting("pageSize", v as PageSize)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="A5">A5</SelectItem>
                        <SelectItem value="Letter">Letter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Margók</Label>
                    <Select
                      value={settings.marginStyle}
                      onValueChange={(v) => updateSetting("marginStyle", v as MarginStyle)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="narrow">Keskeny</SelectItem>
                        <SelectItem value="normal">Normál</SelectItem>
                        <SelectItem value="wide">Széles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Metadata section */}
        <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              Metaadatok
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  metadataOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Alcím (opcionális)</Label>
              <Input
                value={metadata.subtitle || ""}
                onChange={(e) => updateMetadata("subtitle", e.target.value)}
                placeholder="Könyv alcíme"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kiadó</Label>
              <Input
                value={metadata.publisher || ""}
                onChange={(e) => updateMetadata("publisher", e.target.value)}
                placeholder="KönyvÍró AI"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ISBN (opcionális)</Label>
              <Input
                value={metadata.isbn || ""}
                onChange={(e) => updateMetadata("isbn", e.target.value)}
                placeholder="978-..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Könyv leírás (opcionális)</Label>
              <Textarea
                value={metadata.description || ""}
                onChange={(e) => updateMetadata("description", e.target.value)}
                placeholder="Rövid leírás az e-könyvhöz"
                rows={3}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Cover section */}
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Borító</span>
            </div>
            {coverUrl && (
              <Switch checked={useCover} onCheckedChange={setUseCover} />
            )}
          </div>
          {coverUrl ? (
            <div className="flex items-center gap-3">
              <img
                src={coverUrl}
                alt="Borító"
                className="h-16 w-12 object-cover rounded border"
              />
              <span className="text-sm text-muted-foreground">
                {useCover ? "Borító használva" : "Borító mellőzve"}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nincs borító beállítva.{" "}
              <a href={`/project/${projectId}/export`} className="text-primary hover:underline">
                Borító létrehozása
              </a>
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <Button
            className="w-full"
            onClick={handleExport}
            disabled={!canExport}
          >
            Exportálás
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleClose}>
            Mégse
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
