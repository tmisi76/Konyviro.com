import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ProjectFormData } from "../CreateProjectModal";

const genreLabels: Record<NonNullable<ProjectFormData["genre"]>, string> = {
  szakkönyv: "📚 Szakkönyv",
  fiction: "✨ Fiction",
  erotikus: "🔥 Erotikus",
};

const audienceLabels: Record<NonNullable<ProjectFormData["targetAudience"]>, string> = {
  beginner: "Kezdő",
  intermediate: "Haladó",
  expert: "Szakértő",
  general: "Általános",
};

const toneLabels: Record<NonNullable<ProjectFormData["tone"]>, string> = {
  formal: "Formális",
  direct: "Közvetlen",
  friendly: "Baráti",
  provocative: "Provokatív",
};

interface StepSummaryProps {
  formData: ProjectFormData;
  onBack: () => void;
  onCreate: () => void;
  isLoading: boolean;
}

export function StepSummary({ formData, onBack, onCreate, isLoading }: StepSummaryProps) {
  const styles = [
    formData.styleDescriptive && "Leíró",
    formData.styleDialogue && "Dialógus-központú",
    formData.styleAction && "Akció-orientált",
  ].filter(Boolean);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Összefoglaló</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ellenőrizd a beállításokat, majd hozd létre a projektet
        </p>
      </div>

      <div className="mb-8 space-y-4">
        {/* Genre */}
        <SummaryRow
          label="Műfaj"
          value={formData.genre ? genreLabels[formData.genre] : "-"}
        />

        {/* Title */}
        <SummaryRow label="Cím" value={formData.title || "-"} />

        {/* Description */}
        {formData.description && (
          <SummaryRow label="Leírás" value={formData.description} />
        )}

        {/* Target Audience */}
        <SummaryRow
          label="Célközönség"
          value={formData.targetAudience ? audienceLabels[formData.targetAudience] : "-"}
        />

        {/* Target Word Count */}
        <SummaryRow
          label="Tervezett hossz"
          value={`${formData.targetWordCount.toLocaleString("hu-HU")} szó`}
        />

        {/* Tone */}
        <SummaryRow
          label="Hangnem"
          value={formData.tone ? toneLabels[formData.tone] : "-"}
        />

        {/* Complexity */}
        <SummaryRow
          label="Komplexitás"
          value={
            formData.complexity < 33
              ? "Egyszerű"
              : formData.complexity < 66
              ? "Közepes"
              : "Komplex"
          }
        />

        {/* Styles */}
        <SummaryRow
          label="Nyelvi stílus"
          value={styles.length > 0 ? styles.join(", ") : "Nincs kiválasztva"}
        />
      </div>

      <div className="mt-auto flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Vissza
        </Button>
        <Button
          onClick={onCreate}
          disabled={isLoading}
          className="min-w-[180px] bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Létrehozás...
            </>
          ) : (
            "Projekt létrehozása"
          )}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between rounded-lg bg-muted/50 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
