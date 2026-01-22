import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { StepGenre } from "./steps/StepGenre";
import { StepStoryIdea } from "./steps/StepStoryIdea";
import { StepDetails } from "./steps/StepDetails";
import { StepStyle } from "./steps/StepStyle";
import { StepSummary } from "./steps/StepSummary";
import { AgeVerificationModal } from "./AgeVerificationModal";
import { useCreateProject } from "@/hooks/useCreateProject";
import { useAdultVerification } from "@/hooks/useAdultVerification";
import { BookCoachModal } from "@/components/coach/BookCoachModal";
import { CoachSummary } from "@/hooks/useBookCoach";
import type { GeneratedStory } from "@/types/story";

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
  // New story generation fields
  storyIdea: string;
  generatedStory: GeneratedStory | null;
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
  storyIdea: "",
  generatedStory: null,
};

// Steps differ based on genre - fiction/erotikus has story generation step
const getSteps = (genre: ProjectFormData["genre"]) => {
  if (genre === "fiction" || genre === "erotikus") {
    return [
      { id: 1, title: "Műfaj" },
      { id: 2, title: "Sztori" },
      { id: 3, title: "Alapadatok" },
      { id: 4, title: "Stílus" },
      { id: 5, title: "Összefoglaló" },
    ];
  }
  return [
    { id: 1, title: "Műfaj" },
    { id: 2, title: "Alapadatok" },
    { id: 3, title: "Stílus" },
    { id: 4, title: "Összefoglaló" },
  ];
};

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

  const hasStoryStep = formData.genre === "fiction" || formData.genre === "erotikus";
  const steps = getSteps(formData.genre);
  const totalSteps = steps.length;

  const handleOpenCoach = () => {
    if (formData.genre) {
      setShowCoach(true);
    }
  };

  const handleCoachComplete = (summary: CoachSummary) => {
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
    
    if (summary.summary.suggestedOutline && summary.summary.suggestedOutline.length > 0) {
      updates.description = summary.summary.suggestedOutline.join("\n");
    }

    if (summary.summary.protagonist) {
      updates.description = `Főszereplő: ${summary.summary.protagonist}\n${updates.description || ""}`;
    }
    if (summary.summary.setting) {
      updates.description = `${updates.description || ""}\nHelyszín: ${summary.summary.setting}`;
    }

    updateFormData(updates);
    setShowCoach(false);
    
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const handleStoryGenerated = (story: GeneratedStory) => {
    updateFormData({
      generatedStory: story,
      title: story.title,
      description: story.synopsis,
    });
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
    if (currentStep < totalSteps) {
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
    if (hasStoryStep) {
      switch (currentStep) {
        case 1:
          return formData.genre !== null;
        case 2:
          return formData.generatedStory !== null;
        case 3:
          return formData.title.trim().length > 0 && formData.targetAudience !== null;
        case 4:
          return formData.tone !== null;
        case 5:
          return true;
        default:
          return false;
      }
    } else {
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
    }
  };

  // Render step content based on current step and genre
  const renderStepContent = () => {
    if (hasStoryStep) {
      // Fiction/Erotikus flow: Genre -> Story -> Details -> Style -> Summary
      switch (currentStep) {
        case 1:
          return (
            <StepGenre
              selected={formData.genre}
              onSelect={handleGenreSelect}
              onNext={handleNext}
              canProceed={canProceed()}
              isAdultVerified={isVerified}
              onOpenCoach={handleOpenCoach}
            />
          );
        case 2:
          return (
            <StepStoryIdea
              storyIdea={formData.storyIdea}
              onStoryIdeaChange={(idea) => updateFormData({ storyIdea: idea })}
              generatedStory={formData.generatedStory}
              onStoryGenerated={handleStoryGenerated}
              genre={formData.genre || "fiction"}
              tone={formData.tone || undefined}
              targetAudience={formData.targetAudience || undefined}
              onNext={handleNext}
              onBack={handleBack}
            />
          );
        case 3:
          return (
            <StepDetails
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={canProceed()}
            />
          );
        case 4:
          return (
            <StepStyle
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={canProceed()}
            />
          );
        case 5:
          return (
            <StepSummary
              formData={formData}
              onBack={handleBack}
              onCreate={handleCreate}
              isLoading={isLoading}
            />
          );
        default:
          return null;
      }
    } else {
      // Szakkönyv flow: Genre -> Details -> Style -> Summary
      switch (currentStep) {
        case 1:
          return (
            <StepGenre
              selected={formData.genre}
              onSelect={handleGenreSelect}
              onNext={handleNext}
              canProceed={canProceed()}
              isAdultVerified={isVerified}
              onOpenCoach={handleOpenCoach}
            />
          );
        case 2:
          return (
            <StepDetails
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={canProceed()}
            />
          );
        case 3:
          return (
            <StepStyle
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={canProceed()}
            />
          );
        case 4:
          return (
            <StepSummary
              formData={formData}
              onBack={handleBack}
              onCreate={handleCreate}
              isLoading={isLoading}
            />
          );
        default:
          return null;
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          {/* Progress indicator */}
          <div className="border-b border-border bg-muted/30 px-4 py-4">
            <div className="flex items-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors sm:h-8 sm:w-8 sm:text-sm",
                        currentStep === step.id
                          ? "bg-primary text-primary-foreground"
                          : currentStep > step.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {currentStep > step.id ? "✓" : step.id}
                    </div>
                    <span
                      className={cn(
                        "hidden whitespace-nowrap font-medium sm:block",
                        steps.length > 4 ? "text-xs" : "text-sm",
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
                        "mx-2 h-0.5 flex-1 min-w-3 transition-colors",
                        currentStep > step.id ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className="min-h-[400px] p-6">
            {renderStepContent()}
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
