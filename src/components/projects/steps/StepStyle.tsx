import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ProjectFormData } from "../CreateProjectModal";

const toneOptions: { value: ProjectFormData["tone"]; label: string; description: string }[] = [
  { value: "formal", label: "Formális", description: "Hivatalos, szakmai hangvétel" },
  { value: "direct", label: "Közvetlen", description: "Tárgyilagos, egyenes megfogalmazás" },
  { value: "friendly", label: "Baráti", description: "Meleg, személyes hangnem" },
  { value: "provocative", label: "Provokatív", description: "Merész, gondolatébresztő stílus" },
];

const styleOptions = [
  { key: "styleDescriptive", label: "Leíró", description: "Részletes környezet- és érzelemleírások" },
  { key: "styleDialogue", label: "Dialógus-központú", description: "Párbeszédekre építő narratíva" },
  { key: "styleAction", label: "Akció-orientált", description: "Gyors tempójú, eseménydús történet" },
] as const;

interface StepStyleProps {
  formData: ProjectFormData;
  updateFormData: (updates: Partial<ProjectFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

export function StepStyle({
  formData,
  updateFormData,
  onNext,
  onBack,
  canProceed,
}: StepStyleProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Stílus beállítások</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Határozd meg az írásod hangnemét és stílusát
        </p>
      </div>

      <div className="mb-8 space-y-6">
        {/* Tone selection */}
        <div className="space-y-3">
          <Label>Hangnem *</Label>
          <div className="grid grid-cols-2 gap-3">
            {toneOptions.map((tone) => (
              <button
                key={tone.value}
                onClick={() => updateFormData({ tone: tone.value })}
                className={cn(
                  "rounded-lg border-2 p-4 text-left transition-all",
                  formData.tone === tone.value
                    ? "border-secondary bg-secondary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div
                  className={cn(
                    "text-sm font-medium",
                    formData.tone === tone.value ? "text-secondary" : "text-foreground"
                  )}
                >
                  {tone.label}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{tone.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Complexity slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Komplexitás</Label>
            <span className="text-sm text-muted-foreground">
              {formData.complexity < 33
                ? "Egyszerű"
                : formData.complexity < 66
                ? "Közepes"
                : "Komplex"}
            </span>
          </div>
          <Slider
            value={[formData.complexity]}
            onValueChange={([value]) => updateFormData({ complexity: value })}
            min={0}
            max={100}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Egyszerű</span>
            <span>Komplex</span>
          </div>
        </div>

        {/* Style checkboxes */}
        <div className="space-y-3">
          <Label>Nyelvi stílus</Label>
          <div className="space-y-3">
            {styleOptions.map((style) => (
              <label
                key={style.key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                  formData[style.key]
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <Checkbox
                  checked={formData[style.key]}
                  onCheckedChange={(checked) =>
                    updateFormData({ [style.key]: checked === true })
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{style.label}</div>
                  <div className="text-xs text-muted-foreground">{style.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Vissza
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          Következő
        </Button>
      </div>
    </div>
  );
}
