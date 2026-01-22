import { lazy, Suspense, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { WizardProgress } from "./WizardProgress";
import { useBookWizard } from "@/hooks/useBookWizard";
import { Step1Genre } from "./steps/Step1Genre";
import { Step2Subcategory } from "./steps/Step2Subcategory";
import { Step3BasicInfo } from "./steps/Step3BasicInfo";
import { Skeleton } from "@/components/ui/skeleton";

const Step4StoryIdeas = lazy(() => import("./steps/Step4StoryIdeas").then(m => ({ default: m.Step4StoryIdeas })));
const Step5StoryDetail = lazy(() => import("./steps/Step5StoryDetail").then(m => ({ default: m.Step5StoryDetail })));
const Step6ChapterOutline = lazy(() => import("./steps/Step6ChapterOutline").then(m => ({ default: m.Step6ChapterOutline })));

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

export function BookCreationWizard() {
  const navigate = useNavigate();
  const {
    currentStep,
    data,
    isSaving,
    isDirty,
    setGenre,
    setSubcategory,
    setBasicInfo,
    setStoryIdeas,
    selectStoryIdea,
    setDetailedConcept,
    setChapterOutline,
    nextStep,
    prevStep,
    saveProject,
    saveChapterOutline,
    reset,
    startWriting,
  } = useBookWizard();

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

  const handleGenreSelect = (genre: "szakkonyv" | "fiction") => {
    setGenre(genre);
    setTimeout(() => nextStep(), 250);
  };

  const handleSubcategorySelect = (subcategory: any) => {
    setSubcategory(subcategory);
    setTimeout(() => nextStep(), 250);
  };

  const handleBasicInfoSubmit = (info: any) => {
    setBasicInfo(info);
    nextStep();
  };

  const handleStoryIdeaSelect = (idea: any) => {
    selectStoryIdea(idea);
    nextStep();
  };

  const handleConceptAccept = () => {
    nextStep();
  };

  const handleSaveOutline = async () => {
    const projectId = await saveProject();
    if (projectId) {
      return await saveChapterOutline(projectId);
    }
    return false;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Genre selected={data.genre} onSelect={handleGenreSelect} />;
      case 2:
        return data.genre && (
          <Step2Subcategory
            genre={data.genre}
            selected={data.subcategory}
            onSelect={handleSubcategorySelect}
          />
        );
      case 3:
        return (
          <Step3BasicInfo
            genre={data.genre!}
            initialData={{
              title: data.title,
              targetAudience: data.targetAudience,
              tone: data.tone,
              length: data.length,
              additionalInstructions: data.additionalInstructions,
            }}
            onSubmit={handleBasicInfoSubmit}
          />
        );
      case 4:
        return (
          <Suspense fallback={<StepLoader />}>
            <Step4StoryIdeas
              genre={data.genre!}
              subcategory={data.subcategory!}
              tone={data.tone!}
              length={data.length!}
              targetAudience={data.targetAudience}
              additionalInstructions={data.additionalInstructions}
              existingIdeas={data.storyIdeas}
              onIdeasGenerated={setStoryIdeas}
              onSelect={handleStoryIdeaSelect}
            />
          </Suspense>
        );
      case 5:
        return (
          <Suspense fallback={<StepLoader />}>
            <Step5StoryDetail
              genre={data.genre!}
              subcategory={data.subcategory!}
              tone={data.tone!}
              selectedIdea={data.selectedStoryIdea!}
              existingConcept={data.detailedConcept}
              onConceptGenerated={setDetailedConcept}
              onAccept={handleConceptAccept}
            />
          </Suspense>
        );
      case 6:
        return (
          <Suspense fallback={<StepLoader />}>
            <Step6ChapterOutline
              genre={data.genre!}
              length={data.length!}
              detailedConcept={data.detailedConcept}
              existingOutline={data.chapterOutline}
              projectId={data.projectId}
              onOutlineChange={setChapterOutline}
              onSave={handleSaveOutline}
              onStartWriting={startWriting}
              isSaving={isSaving}
              isDirty={isDirty}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
          <WizardProgress currentStep={currentStep} />
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
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
