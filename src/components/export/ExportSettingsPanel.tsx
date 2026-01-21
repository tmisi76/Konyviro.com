import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ExportSettings, FontFamily, FontSize, PageSize, LineSpacing, ExportFormat } from "@/types/export";

interface ExportSettingsPanelProps {
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  selectedFormat: ExportFormat;
}

export function ExportSettingsPanel({
  settings,
  onSettingsChange,
  selectedFormat,
}: ExportSettingsPanelProps) {
  const updateSetting = <K extends keyof ExportSettings>(
    key: K,
    value: ExportSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-foreground">Exportálási beállítások</h3>

      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="title-page" className="text-sm">
            Címoldal hozzáadása
          </Label>
          <Switch
            id="title-page"
            checked={settings.includeTitlePage}
            onCheckedChange={(checked) => updateSetting("includeTitlePage", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="toc" className="text-sm">
            Tartalomjegyzék hozzáadása
          </Label>
          <Switch
            id="toc"
            checked={settings.includeTableOfContents}
            onCheckedChange={(checked) => updateSetting("includeTableOfContents", checked)}
          />
        </div>
      </div>

      {/* Font Selection */}
      <div className="space-y-2">
        <Label className="text-sm">Betűtípus</Label>
        <Select
          value={settings.fontFamily}
          onValueChange={(value) => updateSetting("fontFamily", value as FontFamily)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Merriweather">Merriweather</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label className="text-sm">Betűméret</Label>
        <RadioGroup
          value={settings.fontSize}
          onValueChange={(value) => updateSetting("fontSize", value as FontSize)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="11pt" id="font-11" />
            <Label htmlFor="font-11" className="text-xs cursor-pointer">
              11pt
            </Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="12pt" id="font-12" />
            <Label htmlFor="font-12" className="text-xs cursor-pointer">
              12pt
            </Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="14pt" id="font-14" />
            <Label htmlFor="font-14" className="text-xs cursor-pointer">
              14pt
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Page Size (PDF only) */}
      {selectedFormat === "pdf" && (
        <div className="space-y-2">
          <Label className="text-sm">Oldalméret</Label>
          <RadioGroup
            value={settings.pageSize}
            onValueChange={(value) => updateSetting("pageSize", value as PageSize)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="A4" id="page-a4" />
              <Label htmlFor="page-a4" className="text-xs cursor-pointer">
                A4
              </Label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="A5" id="page-a5" />
              <Label htmlFor="page-a5" className="text-xs cursor-pointer">
                A5
              </Label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="Letter" id="page-letter" />
              <Label htmlFor="page-letter" className="text-xs cursor-pointer">
                Letter
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Line Spacing */}
      <div className="space-y-2">
        <Label className="text-sm">Sorköz</Label>
        <RadioGroup
          value={settings.lineSpacing}
          onValueChange={(value) => updateSetting("lineSpacing", value as LineSpacing)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="1.0" id="spacing-1" />
            <Label htmlFor="spacing-1" className="text-xs cursor-pointer">
              1.0
            </Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="1.5" id="spacing-15" />
            <Label htmlFor="spacing-15" className="text-xs cursor-pointer">
              1.5
            </Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="2.0" id="spacing-2" />
            <Label htmlFor="spacing-2" className="text-xs cursor-pointer">
              2.0
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
