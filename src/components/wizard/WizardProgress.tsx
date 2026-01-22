import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  BookOpen, 
  Tags, 
  FileText, 
  Lightbulb, 
  Edit, 
  List, 
  PenTool,
  Check 
} from "lucide-react";

interface WizardProgressProps {
  currentStep: number;
  completedSteps?: number[];
}

const STEPS = [
  { id: 1, label: "Műfaj", icon: BookOpen },
  { id: 2, label: "Kategória", icon: Tags },
  { id: 3, label: "Adatok", icon: FileText },
  { id: 4, label: "Ötletek", icon: Lightbulb },
  { id: 5, label: "Koncepció", icon: Edit },
  { id: 6, label: "Fejezetek", icon: List },
  { id: 7, label: "Írás", icon: PenTool },
];

export function WizardProgress({ currentStep, completedSteps = [] }: WizardProgressProps) {
  return (
    <div className="w-full py-6 px-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id) || step.id < currentStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    backgroundColor: isActive 
                      ? "hsl(var(--primary))" 
                      : isCompleted 
                        ? "hsl(var(--primary) / 0.8)" 
                        : "hsl(var(--muted))",
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isActive && "ring-4 ring-primary/20",
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <Icon className={cn(
                      "w-5 h-5",
                      isActive || isCompleted 
                        ? "text-primary-foreground" 
                        : "text-muted-foreground"
                    )} />
                  )}
                </motion.div>
                <span className={cn(
                  "text-xs mt-2 font-medium hidden sm:block",
                  isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 relative">
                  <div className="absolute inset-0 bg-muted rounded-full" />
                  <motion.div
                    initial={false}
                    animate={{
                      scaleX: isCompleted ? 1 : 0,
                    }}
                    className="absolute inset-0 bg-primary rounded-full origin-left"
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
