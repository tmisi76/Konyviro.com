import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  FileText,
  Printer,
  Loader2,
  BookOpen,
  Image,
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

export function StorybookExport({ data, projectId }: StorybookExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: "pdf",
    includeBleed: false,
    highResolution: true,
    separatePages: false,
  });

  const handleExport = async () => {
    setIsExporting(true);
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
          storybookData: data,
        },
      });

      if (error) throw error;

      if (response.downloadUrl) {
        // Trigger download
        const link = document.createElement("a");
        link.href = response.downloadUrl;
        link.download = `${data.title || "mesekonyv"}.${options.format === "images" ? "zip" : "pdf"}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exportálás sikeres!");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Hiba az exportálás során");
    } finally {
      setIsExporting(false);
    }
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

      {/* Format selection */}
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

          {options.format === "print-ready" && (
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
    </div>
  );
}
