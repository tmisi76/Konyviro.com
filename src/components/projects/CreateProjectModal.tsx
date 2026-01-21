import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { StepGenre } from "./steps/StepGenre";
import { StepDetails } from "./steps/StepDetails";
import { StepStyle } from "./steps/StepStyle";
import { StepSummary } from "./steps/StepSummary";
import { AgeVerificationModal } from "./AgeVerificationModal";
import { useCreateProject } from "@/hooks/useCreateProject";
import { useAdultVerification } from "@/hooks/useAdultVerification";
import { BookCoachModal } from "@/components/coach/BookCoachModal";
import { CoachSummary } from "@/hooks/useBookCoach";

export interface ProjectFormData {
  genre: "szakkönyv" | "fiction" | "erotikus" | null;
  title: string;
  description: string;
  targetAudience: "beginner" | "intermediate" | "expert" | "general" | null;
  targetWordCount: number;
  tone: "formal" | "direct" | "friendly" | "provocative" | null;
  complexity: number;
  styleDescriptive: boolean;
  styleDialogue: boolean;
  styleAction: boolean;
}

const initialFormData: ProjectFormData = {
  genre: null,
  title: "",
  description: "",
  targetAudience: null,
  targetWordCount: 50000,
  tone: null,
  complexity: 50,
  styleDescriptive: false,
  styleDialogue: false,
  styleAction: false,
};

const steps = [
  { id: 1, title: "Műfaj" },
  { id: 2, title: "Alapadatok" },
  { id: 3, title: "Stílus" },
  { id: 4, title: "Összefoglaló" },
];

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [pendingGenre, setPendingGenre] = useState<ProjectFormData["genre"]>(null);
  const [showCoach, setShowCoach] = useState(false);
  
  const { createProject, isLoading } = useCreateProject();
  const { isVerified, verifyAdultContent } = useAdultVerification();

  const handleOpenCoach = () => {
    if (formData.genre) {
      setShowCoach(true);
    }
  };

  const handleCoachComplete = (summary: CoachSummary) => {
    // Populate form data from coach summary
    const updates: Partial<ProjectFormData> = {};
    
    if (summary.summary.topic) {
      updates.title = summary.summary.topic;
    }
    if (summary.summary.audience) {
      if (summary.summary.audience.toLowerCase().includes("kezdő")) {
        updates.targetAudience = "beginner";
      } else if (summary.summary.audience.toLowerCase().includes("haladó")) {
        updates.targetAudience = "intermediate";
      } else if (summary.summary.audience.toLowerCase().includes("szakértő")) {
        updates.targetAudience = "expert";
      } else {
        updates.targetAudience = "general";
      }
    }
    if (summary.summary.toneRecommendation) {
      const tone = summary.summary.toneRecommendation.toLowerCase();
      if (tone.includes("formális")) {
        updates.tone = "formal";
      } else if (tone.includes("direkt")) {
        updates.tone = "direct";
      } else if (tone.includes("barátságos")) {
        updates.tone = "friendly";
      } else if (tone.includes("provokatív")) {
        updates.tone = "provocative";
      }
    }
    
    // Store outline in description for now
    if (summary.summary.suggestedOutline && summary.summary.suggestedOutline.length > 0) {
      updates.description = summary.summary.suggestedOutline.join("\n");
    }

    // For fiction/erotikus, use protagonist info
    if (summary.summary.protagonist) {
      updates.description = `Főszereplő: ${summary.summary.protagonist}\n${updates.description || ""}`;
    }
    if (summary.summary.setting) {
      updates.description = `${updates.description || ""}\nHelyszín: ${summary.summary.setting}`;
    }

    updateFormData(updates);
    setShowCoach(false);
    
    // Move to next step
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const updateFormData = (updates: Partial<ProjectFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleGenreSelect = (genre: ProjectFormData["genre"]) => {
    if (genre === "erotikus" && !isVerified) {
      setPendingGenre(genre);
      setShowAgeVerification(true);
    } else {
      updateFormData({ genre });
    }
  };

  const handleAgeVerificationConfirm = async () => {
    const success = await verifyAdultContent();
    if (success && pendingGenre) {
      updateFormData({ genre: pendingGenre });
      setShowAgeVerification(false);
      setPendingGenre(null);
    }
  };

  const handleAgeVerificationCancel = () => {
    setShowAgeVerification(false);
    setPendingGenre(null);
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCreate = async () => {
    const success = await createProject(formData);
    if (success) {
      onOpenChange(false);
      setCurrentStep(1);
      setFormData(initialFormData);
      onSuccess?.();
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setCurrentStep(1);
      setFormData(initialFormData);
    }
    onOpenChange(isOpen);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.genre !== null;
      case 2:
        return formData.title.trim().length > 0 && formData.targetAudience !== null;
      case 3:
        return formData.tone !== null;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          {/* Progress indicator */}
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                        currentStep === step.id
                          ? "bg-secondary text-secondary-foreground"
                          : currentStep > step.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {currentStep > step.id ? "✓" : step.id}
                    </div>
                    <span
                      className={cn(
                        "hidden text-sm font-medium sm:block",
                        currentStep === step.id
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "mx-3 h-0.5 w-8 transition-colors sm:w-12",
                        currentStep > step.id ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step content with animation */}
          <div className="relative min-h-[400px] overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${(currentStep - 1) * 100}%)` }}
            >
              <div className="w-full shrink-0 p-6">
                <StepGenre
                  selected={formData.genre}
                  onSelect={handleGenreSelect}
                  onNext={handleNext}
                  canProceed={canProceed()}
                  isAdultVerified={isVerified}
                  onOpenCoach={handleOpenCoach}
                />
              </div>
              <div className="w-full shrink-0 p-6">
                <StepDetails
                  formData={formData}
                  updateFormData={updateFormData}
                  onNext={handleNext}
                  onBack={handleBack}
                  canProceed={canProceed()}
                />
              </div>
              <div className="w-full shrink-0 p-6">
                <StepStyle
                  formData={formData}
                  updateFormData={updateFormData}
                  onNext={handleNext}
                  onBack={handleBack}
                  canProceed={canProceed()}
                />
              </div>
              <div className="w-full shrink-0 p-6">
                <StepSummary
                  formData={formData}
                  onBack={handleBack}
                  onCreate={handleCreate}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Age Verification Modal */}
      <AgeVerificationModal
        open={showAgeVerification}
        onOpenChange={setShowAgeVerification}
        onConfirm={handleAgeVerificationConfirm}
        onCancel={handleAgeVerificationCancel}
      />

      {/* Book Coach Modal */}
      {formData.genre && (
        <BookCoachModal
          open={showCoach}
          onOpenChange={setShowCoach}
          genre={formData.genre}
          onComplete={handleCoachComplete}
        />
      )}
    </>
  );
}
