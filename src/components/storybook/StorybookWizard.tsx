import { lazy, Suspense, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { useStorybookWizard } from "@/hooks/useStorybookWizard";
import { useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Wizard steps
import { StorybookThemeStep } from "./steps/StorybookThemeStep";
import { StorybookAgeGroupStep } from "./steps/StorybookAgeGroupStep";
import { StorybookCharactersStep } from "./steps/StorybookCharactersStep";
import { StorybookStyleStep } from "./steps/StorybookStyleStep";
import { StorybookStoryStep } from "./steps/StorybookStoryStep";

const StorybookGenerateStep = lazy(() => import("./steps/StorybookGenerateStep").then(m => ({ default: m.StorybookGenerateStep })));
const StorybookPreviewStep = lazy(() => import("./steps/StorybookPreviewStep").then(m => ({ default: m.StorybookPreviewStep })));

function StepLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <Skeleton className="h-10 w-64 mb-4" />
      <Skeleton className="h-6 w-48 mb-8" />
      <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

function WizardProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i + 1 <= currentStep 
              ? "w-8 bg-primary" 
              : "w-2 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function StorybookWizard() {
  const navigate = useNavigate();
  const { isProjectLimitReached, isLoading: isSubscriptionLoading } = useSubscription();
  const {
    currentStep,
    maxSteps,
    data,
    isSaving,
    isGenerating,
    isDirty,
    setTheme,
    setCustomThemeDescription,
    setAgeGroup,
    setIllustrationStyle,
    setTitle,
    setStoryPrompt,
    addCharacter,
    removeCharacter,
    updateCharacter,
    setPages,
    updatePage,
    nextStep,
    prevStep,
    reset,
    uploadCharacterPhoto,
    generateStory,
    generateIllustration,
    generateAllIllustrations,
    saveProject,
  } = useStorybookWizard();

  useEffect(() => {
    if (!isSubscriptionLoading && isProjectLimitReached()) {
      toast.error("Elérted a projekt limitet. Frissíts a csomagodra!");
      navigate("/dashboard");
    }
  }, [isSubscriptionLoading, isProjectLimitReached, navigate]);

  const handleClose = () => {
    if (isDirty) {
      if (confirm("Biztosan kilépsz? A nem mentett módosítások elvesznek.")) {
        reset();
        navigate("/dashboard");
      }
    } else {
      reset();
      navigate("/dashboard");
    }
  };

  const handleThemeSelect = (theme: string) => {
    setTheme(theme as any);
    setTimeout(() => nextStep(), 250);
  };

  const handleAgeGroupSelect = (ageGroup: string) => {
    setAgeGroup(ageGroup as any);
    setTimeout(() => nextStep(), 250);
  };

  const handleStyleSelect = (style: string) => {
    setIllustrationStyle(style as any);
    setTimeout(() => nextStep(), 250);
  };

  const handleCharactersComplete = () => {
    nextStep();
  };

  const handleStoryComplete = () => {
    nextStep();
  };

  const handleGenerateComplete = () => {
    nextStep();
  };

  const handleExport = async () => {
    const projectId = await saveProject();
    if (projectId) {
      navigate(`/project/${projectId}/export?type=storybook`);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StorybookThemeStep
            selected={data.theme}
            customDescription={data.customThemeDescription}
            onSelect={handleThemeSelect}
            onCustomDescriptionChange={setCustomThemeDescription}
          />
        );
      case 2:
        return (
          <StorybookAgeGroupStep
            selected={data.ageGroup}
            onSelect={handleAgeGroupSelect}
          />
        );
      case 3:
        return (
          <StorybookCharactersStep
            characters={data.characters}
            onAddCharacter={addCharacter}
            onRemoveCharacter={removeCharacter}
            onUpdateCharacter={updateCharacter}
            onUploadPhoto={uploadCharacterPhoto}
            onComplete={handleCharactersComplete}
          />
        );
      case 4:
        return (
          <StorybookStyleStep
            selected={data.illustrationStyle}
            onSelect={handleStyleSelect}
          />
        );
      case 5:
        return (
          <StorybookStoryStep
            title={data.title}
            storyPrompt={data.storyPrompt}
            theme={data.theme}
            onTitleChange={setTitle}
            onStoryPromptChange={setStoryPrompt}
            onComplete={handleStoryComplete}
          />
        );
      case 6:
        return (
          <Suspense fallback={<StepLoader />}>
            <StorybookGenerateStep
              data={data}
              isGenerating={isGenerating}
              onGenerateStory={generateStory}
              onGenerateIllustrations={generateAllIllustrations}
              onComplete={handleGenerateComplete}
              setPages={setPages}
            />
          </Suspense>
        );
      case 7:
        return (
          <Suspense fallback={<StepLoader />}>
            <StorybookPreviewStep
              data={data}
              onUpdatePage={updatePage}
              onRegenerateIllustration={generateIllustration}
              onRegenerateMissingIllustrations={generateAllIllustrations}
              onSave={saveProject}
              onExport={handleExport}
              isSaving={isSaving}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  // Full screen preview mode for last step
  if (currentStep === 7) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Vissza
            </Button>
            <h2 className="font-semibold">Mesekönyv előnézet</h2>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={currentStep > 1 ? prevStep : handleClose}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep > 1 ? "Vissza" : "Mégse"}
          </Button>
          <WizardProgress currentStep={currentStep} totalSteps={maxSteps} />
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
