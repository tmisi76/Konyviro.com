import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  FileText,
  Printer,
  Loader2,
  BookOpen,
  Image,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { StorybookData } from "@/types/storybook";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StorybookExportProps {
  data: StorybookData;
  projectId: string;
}

type ExportFormat = "pdf" | "images" | "print-ready";

interface ExportOptions {
  format: ExportFormat;
  includeBleed: boolean;
  highResolution: boolean;
  separatePages: boolean;
}

type ExportStatus = "idle" | "processing" | "polling" | "completed" | "failed";

const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_ATTEMPTS = 60; // 3 minutes max

export function StorybookExport({ data, projectId }: StorybookExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [pollProgress, setPollProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [options, setOptions] = useState<ExportOptions>({
    format: "pdf",
    includeBleed: false,
    highResolution: true,
    separatePages: false,
  });

  // Polling for export status
  const pollExportStatus = useCallback(async (exportId: string, jobId: string, attempt = 0) => {
    if (attempt >= MAX_POLL_ATTEMPTS) {
      setExportStatus("failed");
      setErrorMessage("Az exportálás túl sokáig tartott. Kérlek próbáld újra később.");
      setIsExporting(false);
      return;
    }

    try {
      const { data: response, error } = await supabase.functions.invoke("export-status", {
        body: { exportId, jobId },
      });

      if (error) throw error;

      setPollProgress(Math.min((attempt / MAX_POLL_ATTEMPTS) * 100, 95));

      if (response.status === "completed" && response.fileUrl) {
        setExportStatus("completed");
        setDownloadUrl(response.fileUrl);
        setIsExporting(false);
        setPollProgress(100);
        toast.success("Exportálás sikeres!");
      } else if (response.status === "failed") {
        setExportStatus("failed");
        setErrorMessage(response.errorMessage || "Hiba az exportálás során");
        setIsExporting(false);
      } else {
        // Still processing, continue polling
        setTimeout(() => pollExportStatus(exportId, jobId, attempt + 1), POLL_INTERVAL);
      }
    } catch (error) {
      console.error("Poll error:", error);
      // Retry on network error
      if (attempt < MAX_POLL_ATTEMPTS - 1) {
        setTimeout(() => pollExportStatus(exportId, jobId, attempt + 1), POLL_INTERVAL);
      } else {
        setExportStatus("failed");
        setErrorMessage("Hiba a státusz lekérdezése során");
        setIsExporting(false);
      }
    }
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus("processing");
    setDownloadUrl(null);
    setErrorMessage(null);
    setPollProgress(0);

    try {
      const { data: response, error } = await supabase.functions.invoke("export-storybook", {
        body: {
          projectId,
          format: options.format,
          options: {
            includeBleed: options.includeBleed,
            highResolution: options.highResolution,
            separatePages: options.separatePages,
          },
          storybookData: {
            title: data.title,
            pages: data.pages,
            coverUrl: data.coverUrl,
            ageGroup: data.ageGroup,
            illustrationStyle: data.illustrationStyle,
          },
        },
      });

      if (error) throw error;

      if (response.jobId && response.exportId) {
        // CloudConvert job started, begin polling
        setExportStatus("polling");
        pollExportStatus(response.exportId, response.jobId);
      } else if (response.downloadUrl) {
        // Direct download (legacy/fallback)
        setDownloadUrl(response.downloadUrl);
        setExportStatus("completed");
        setIsExporting(false);
        toast.success("Exportálás sikeres!");
      }
    } catch (error) {
      console.error("Export error:", error);
      setExportStatus("failed");
      setErrorMessage("Hiba az exportálás indítása során");
      toast.error("Hiba az exportálás során");
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${data.title || "mesekonyv"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetExport = () => {
    setExportStatus("idle");
    setDownloadUrl(null);
    setErrorMessage(null);
    setPollProgress(0);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold mb-2">Mesekönyv exportálása</h2>
        <p className="text-muted-foreground">
          Válaszd ki az exportálási formátumot és beállításokat
        </p>
      </motion.div>

      {/* Status display */}
      {exportStatus !== "idle" && (
        <Card className={
          exportStatus === "completed" ? "border-green-500 bg-green-50 dark:bg-green-950/20" :
          exportStatus === "failed" ? "border-red-500 bg-red-50 dark:bg-red-950/20" :
          "border-primary bg-primary/5"
        }>
          <CardContent className="pt-6">
            {exportStatus === "processing" || exportStatus === "polling" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <div>
                    <p className="font-medium">
                      {exportStatus === "processing" ? "Exportálás indítása..." : "PDF készítése folyamatban..."}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ez eltarthat 1-2 percig
                    </p>
                  </div>
                </div>
                <Progress value={pollProgress} className="h-2" />
              </div>
            ) : exportStatus === "completed" ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">Exportálás sikeres!</p>
                    <p className="text-sm text-muted-foreground">A PDF készen áll a letöltésre</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownload} className="gap-2">
                    <Download className="w-4 h-4" />
                    Letöltés
                  </Button>
                  <Button variant="outline" onClick={resetExport}>
                    Új exportálás
                  </Button>
                </div>
              </div>
            ) : exportStatus === "failed" ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-400">Hiba történt</p>
                    <p className="text-sm text-muted-foreground">{errorMessage}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={resetExport}>
                  Újrapróbálás
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Format selection - only show when idle */}
      {exportStatus === "idle" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formátum</CardTitle>
              <CardDescription>Válaszd ki a kívánt formátumot</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={options.format}
                onValueChange={(value) => setOptions({ ...options, format: value as ExportFormat })}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <Label
                  htmlFor="pdf"
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"
                  data-state={options.format === "pdf" ? "checked" : "unchecked"}
                >
                  <RadioGroupItem value="pdf" id="pdf" className="sr-only" />
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <div className="font-medium">PDF</div>
                    <div className="text-sm text-muted-foreground">Digitális olvasáshoz</div>
                  </div>
                </Label>

                <Label
                  htmlFor="images"
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"
                  data-state={options.format === "images" ? "checked" : "unchecked"}
                >
                  <RadioGroupItem value="images" id="images" className="sr-only" />
                  <Image className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <div className="font-medium">Képek</div>
                    <div className="text-sm text-muted-foreground">Külön oldalanként</div>
                  </div>
                </Label>

                <Label
                  htmlFor="print-ready"
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"
                  data-state={options.format === "print-ready" ? "checked" : "unchecked"}
                >
                  <RadioGroupItem value="print-ready" id="print-ready" className="sr-only" />
                  <Printer className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <div className="font-medium">Nyomtatásra kész</div>
                    <div className="text-sm text-muted-foreground">Professzionális nyomtatáshoz</div>
                  </div>
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Export options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Beállítások</CardTitle>
              <CardDescription>Testreszabási lehetőségek</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="highRes"
                  checked={options.highResolution}
                  onCheckedChange={(checked) => 
                    setOptions({ ...options, highResolution: checked as boolean })
                  }
                />
                <Label htmlFor="highRes" className="cursor-pointer">
                  <div className="font-medium">Nagy felbontás</div>
                  <div className="text-sm text-muted-foreground">300 DPI nyomtatási minőség</div>
                </Label>
              </div>

              {(options.format === "print-ready" || options.format === "pdf") && (
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bleed"
                    checked={options.includeBleed}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, includeBleed: checked as boolean })
                    }
                  />
                  <Label htmlFor="bleed" className="cursor-pointer">
                    <div className="font-medium">Kifutó (bleed) hozzáadása</div>
                    <div className="text-sm text-muted-foreground">3mm kifutó a széleken</div>
                  </Label>
                </div>
              )}

              {options.format === "images" && (
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="separate"
                    checked={options.separatePages}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, separatePages: checked as boolean })
                    }
                  />
                  <Label htmlFor="separate" className="cursor-pointer">
                    <div className="font-medium">Külön fájlok</div>
                    <div className="text-sm text-muted-foreground">Minden oldal külön képfájlként</div>
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview info */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <BookOpen className="w-10 h-10 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">{data.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.pages.length} oldal • {data.characters.length} szereplő
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Stílus: {data.illustrationStyle}
                  </p>
                  {data.coverUrl && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      ✓ Borító kép elérhető
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exportálás...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Exportálás
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
