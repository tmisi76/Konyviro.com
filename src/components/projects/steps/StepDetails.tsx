import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectFormData } from "../CreateProjectModal";

const audienceOptions = [
  { value: "beginner", label: "Kezdő" },
  { value: "intermediate", label: "Haladó" },
  { value: "expert", label: "Szakértő" },
  { value: "general", label: "Általános" },
];

const lengthPresets = [
  { value: 10000, label: "Novella", description: "~10.000 szó" },
  { value: 50000, label: "Regény", description: "~50.000 szó" },
  { value: 100000, label: "Hosszú", description: "100.000+ szó" },
];

interface StepDetailsProps {
  formData: ProjectFormData;
  updateFormData: (updates: Partial<ProjectFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

export function StepDetails({
  formData,
  updateFormData,
  onNext,
  onBack,
  canProceed,
}: StepDetailsProps) {
  const handleDescriptionChange = (value: string) => {
    if (value.length <= 200) {
      updateFormData({ description: value });
    }
  };

  const getClosestPreset = (value: number) => {
    return lengthPresets.reduce((prev, curr) =>
      Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Alapadatok</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add meg a könyved alapvető adatait
        </p>
      </div>

      <div className="mb-8 space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Könyv címe *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => updateFormData({ title: e.target.value })}
            placeholder="Add meg a könyved címét..."
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Rövid leírás</Label>
            <span className="text-xs text-muted-foreground">
              {formData.description.length}/200
            </span>
          </div>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Írd le röviden, miről szól a könyved..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label htmlFor="audience">Célközönség *</Label>
          <Select
            value={formData.targetAudience || ""}
            onValueChange={(value) =>
              updateFormData({
                targetAudience: value as ProjectFormData["targetAudience"],
              })
            }
          >
            <SelectTrigger id="audience">
              <SelectValue placeholder="Válassz célközönséget..." />
            </SelectTrigger>
            <SelectContent>
              {audienceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target Word Count */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Tervezett hossz</Label>
            <span className="text-sm font-medium text-foreground">
              {formData.targetWordCount.toLocaleString("hu-HU")} szó
            </span>
          </div>

          <Slider
            value={[formData.targetWordCount]}
            onValueChange={([value]) => updateFormData({ targetWordCount: value })}
            min={5000}
            max={150000}
            step={5000}
            className="py-2"
          />

          <div className="flex justify-between gap-2">
            {lengthPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => updateFormData({ targetWordCount: preset.value })}
                className={`flex-1 rounded-lg border px-3 py-2 text-center transition-colors ${
                  getClosestPreset(formData.targetWordCount).value === preset.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-sm font-medium">{preset.label}</div>
                <div className="text-xs text-muted-foreground">{preset.description}</div>
              </button>
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
