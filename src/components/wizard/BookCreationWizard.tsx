import { lazy, Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { WizardProgress } from "./WizardProgress";
import { useBookWizard } from "@/hooks/useBookWizard";
import { useSubscription } from "@/hooks/useSubscription";
import { Step1Genre } from "./steps/Step1Genre";
import { Step2Subcategory } from "./steps/Step2Subcategory";
import { Step3BasicInfo } from "./steps/Step3BasicInfo";
import { Step3AuthorInfo } from "./steps/Step3AuthorInfo";
import { Step3FictionStyle } from "./steps/Step3FictionStyle";
import { Step3BookType } from "./steps/Step3BookType";
import { Step5BookTypeData } from "./steps/Step5BookTypeData";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { AuthorProfile, FictionStyleSettings, NonfictionBookType, BookTypeSpecificData, Subcategory, StoryIdea } from "@/types/wizard";

const Step4StoryIdeas = lazy(() => import("./steps/Step4StoryIdeas").then(m => ({ default: m.Step4StoryIdeas })));
const Step5StoryDetail = lazy(() => import("./steps/Step5StoryDetail").then(m => ({ default: m.Step5StoryDetail })));
const Step6ChapterOutline = lazy(() => import("./steps/Step6ChapterOutline").then(m => ({ default: m.Step6ChapterOutline })));
const Step7AutoWrite = lazy(() => import("./steps/Step7AutoWrite").then(m => ({ default: m.Step7AutoWrite })));

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

interface GeneratedCharacter {
  name: string;
  role: "protagonist" | "antagonist" | "supporting";
  age?: number;
  gender?: string;
  occupation?: string;
  appearance?: string;
  positiveTraits?: string[];
  negativeTraits?: string[];
  backstory?: string;
  motivation?: string;
  speechStyle?: string;
}

export function BookCreationWizard() {
  const navigate = useNavigate();
  const { isProjectLimitReached, isLoading: isSubscriptionLoading } = useSubscription();
  const [checkpointMode, setCheckpointMode] = useState(false);
  const [pendingCharacters, setPendingCharacters] = useState<GeneratedCharacter[]>([]);
  const {
    currentStep,
    maxSteps,
    data,
    isSaving,
    isDirty,
    setGenre,
    setSubcategory,
    setNonfictionBookType,
    setBookTypeSpecificData,
    setBasicInfo,
    setAuthorProfile,
    setFictionStyle,
    setStoryIdeas,
    selectStoryIdea,
    setDetailedConcept,
    setChapterOutline,
    setEstimatedWritingMinutes,
    nextStep,
    prevStep,
    saveProject,
    saveChapterOutline,
    saveCharactersFromStory,
    reset,
    startWriting,
    startSemiAutomatic,
    startAutoWriting,
  } = useBookWizard();

  const isNonFiction = data.genre === "szakkonyv";

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

  const handleGenreSelect = (genre: "szakkonyv" | "fiction" | "mesekonyv") => {
    // Redirect to storybook wizard if mesekonyv is selected
    if (genre === "mesekonyv") {
      sessionStorage.removeItem("storybook-wizard-data");
      navigate("/create-storybook");
      return;
    }
    setGenre(genre);
    setTimeout(() => nextStep(), 250);
  };

  const handleSubcategorySelect = (subcategory: Subcategory) => {
    setSubcategory(subcategory);
    setTimeout(() => nextStep(), 250);
  };

  const handleFictionStyleSubmit = (style: FictionStyleSettings) => {
    setFictionStyle(style);
    nextStep();
  };

  const handleBookTypeSelect = (bookType: NonfictionBookType) => {
    setNonfictionBookType(bookType);
    setTimeout(() => nextStep(), 250);
  };

  const handleBookTypeDataSubmit = (typeData: BookTypeSpecificData, length: number) => {
    setBookTypeSpecificData(typeData, length);
    nextStep();
  };

  const handleBasicInfoSubmit = (info: Parameters<typeof setBasicInfo>[0]) => {
    setBasicInfo(info);
    nextStep();
  };

  const handleAuthorProfileSubmit = (profile: AuthorProfile) => {
    setAuthorProfile(profile);
    nextStep();
  };

  const handleStoryIdeaSelect = (idea: StoryIdea) => {
    selectStoryIdea(idea);
    nextStep();
  };

  const handleConceptGenerated = async (concept: string, characters?: GeneratedCharacter[]) => {
    setDetailedConcept(concept);
    if (characters && characters.length > 0) {
      setPendingCharacters(characters);
    }
  };

  const handleConceptAccept = async () => {
    nextStep();
  };

  const handleSaveOutline = async () => {
    const projectId = await saveProject();
    if (projectId) {
      if (pendingCharacters.length > 0) {
        await saveCharactersFromStory(projectId, pendingCharacters);
        setPendingCharacters([]);
      }
      return await saveChapterOutline(projectId);
    }
    return false;
  };

  const handleStartWriting = (isCheckpoint?: boolean) => {
    setCheckpointMode(!!isCheckpoint);
    startWriting();
  };

  const totalSteps = maxSteps;
  const isLastStep = currentStep === totalSteps;

  const renderStep = () => {
    // FICTION FLOW (8 steps)
    if (!isNonFiction) {
      switch (currentStep) {
        case 1: return <Step1Genre selected={data.genre} onSelect={handleGenreSelect} />;
        case 2: return data.genre && <Step2Subcategory genre={data.genre} selected={data.subcategory} onSelect={handleSubcategorySelect} />;
        case 3: return <Step3FictionStyle subcategory={data.subcategory} initialData={data.fictionStyle} onSubmit={handleFictionStyleSubmit} />;
        case 4: return <Step3BasicInfo genre={data.genre!} initialData={{ title: data.title, storyDescription: data.storyDescription, targetAudience: data.targetAudience, tone: data.tone, length: data.length, additionalInstructions: data.additionalInstructions }} onSubmit={handleBasicInfoSubmit} />;
        case 5: return <Suspense fallback={<StepLoader />}><Step4StoryIdeas genre={data.genre!} subcategory={data.subcategory!} tone={data.tone!} length={data.length!} targetAudience={data.targetAudience} additionalInstructions={data.additionalInstructions} storyDescription={data.storyDescription} existingIdeas={data.storyIdeas} onIdeasGenerated={setStoryIdeas} onSelect={handleStoryIdeaSelect} authorProfile={data.authorProfile} fictionStyle={data.fictionStyle} /></Suspense>;
        case 6: return <Suspense fallback={<StepLoader />}><Step5StoryDetail genre={data.genre!} subcategory={data.subcategory!} tone={data.tone!} selectedIdea={data.selectedStoryIdea!} existingConcept={data.detailedConcept} onConceptGenerated={handleConceptGenerated} onAccept={handleConceptAccept} authorProfile={data.authorProfile} fictionStyle={data.fictionStyle} /></Suspense>;
        case 7: return <Suspense fallback={<StepLoader />}><Step6ChapterOutline genre={data.genre!} length={data.length!} detailedConcept={data.detailedConcept} existingOutline={data.chapterOutline} projectId={data.projectId} onOutlineChange={setChapterOutline} onSave={handleSaveOutline} onStartWriting={handleStartWriting} onStartSemiAutomatic={startSemiAutomatic} onStartAutoWriting={startAutoWriting} onEstimatedMinutesChange={setEstimatedWritingMinutes} isSaving={isSaving} isDirty={isDirty} /></Suspense>;
        case 8: return <Suspense fallback={<StepLoader />}><Step7AutoWrite projectId={data.projectId!} genre={data.genre!} estimatedMinutes={data.estimatedWritingMinutes || undefined} checkpointMode={checkpointMode} onComplete={() => navigate(`/project/${data.projectId}`)} /></Suspense>;
        default: return null;
      }
    }

    // NONFICTION FLOW (9 steps)
    switch (currentStep) {
      case 1: return <Step1Genre selected={data.genre} onSelect={handleGenreSelect} />;
      case 2: return data.genre && <Step2Subcategory genre={data.genre} selected={data.subcategory} onSelect={handleSubcategorySelect} />;
      case 3: return <Step3BookType selected={data.nonfictionBookType} onSelect={handleBookTypeSelect} />;
      case 4: return <Step3AuthorInfo initialData={data.authorProfile} onSubmit={handleAuthorProfileSubmit} />;
      case 5: return data.nonfictionBookType && <Step5BookTypeData bookType={data.nonfictionBookType} initialData={data.bookTypeSpecificData} onSubmit={handleBookTypeDataSubmit} />;
      case 6: return <Suspense fallback={<StepLoader />}><Step4StoryIdeas genre={data.genre!} subcategory={data.subcategory!} tone={data.tone!} length={data.length!} targetAudience={data.targetAudience} additionalInstructions={data.additionalInstructions} storyDescription={data.storyDescription} existingIdeas={data.storyIdeas} onIdeasGenerated={setStoryIdeas} onSelect={handleStoryIdeaSelect} authorProfile={data.authorProfile} fictionStyle={data.fictionStyle} /></Suspense>;
      case 7: return <Suspense fallback={<StepLoader />}><Step5StoryDetail genre={data.genre!} subcategory={data.subcategory!} tone={data.tone!} selectedIdea={data.selectedStoryIdea!} existingConcept={data.detailedConcept} onConceptGenerated={handleConceptGenerated} onAccept={handleConceptAccept} authorProfile={data.authorProfile} fictionStyle={data.fictionStyle} /></Suspense>;
      case 8: return <Suspense fallback={<StepLoader />}><Step6ChapterOutline genre={data.genre!} length={data.length!} detailedConcept={data.detailedConcept} existingOutline={data.chapterOutline} projectId={data.projectId} onOutlineChange={setChapterOutline} onSave={handleSaveOutline} onStartWriting={handleStartWriting} onStartSemiAutomatic={startSemiAutomatic} onStartAutoWriting={startAutoWriting} onEstimatedMinutesChange={setEstimatedWritingMinutes} isSaving={isSaving} isDirty={isDirty} /></Suspense>;
      case 9: return <Suspense fallback={<StepLoader />}><Step7AutoWrite projectId={data.projectId!} genre={data.genre!} estimatedMinutes={data.estimatedWritingMinutes || undefined} checkpointMode={checkpointMode} onComplete={() => navigate(`/project/${data.projectId}`)} /></Suspense>;
      default: return null;
    }
  };

  if (isLastStep) {
    return (
      <div className="min-h-screen bg-background">
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
          <WizardProgress currentStep={currentStep} totalSteps={totalSteps} />
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
