import { Zap, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: "projects" | "words";
  currentLimit: number;
}

export function UpgradeModal({
  open,
  onOpenChange,
  limitType,
  currentLimit,
}: UpgradeModalProps) {
  const navigate = useNavigate();

  const content = {
    projects: {
      icon: Crown,
      title: "Projekt limit elérve",
      description: `Elérted a ${currentLimit} aktív projekt limitedet. Frissíts magasabb csomagra több projekthez!`,
      features: [
        "Több aktív projekt",
        "Több AI generálás",
        "Prémium export formátumok",
      ],
    },
    words: {
      icon: Zap,
      title: "AI generálási limit elérve",
      description: `Elérted a havi ${currentLimit.toLocaleString("hu-HU")} szavas AI limitedet. Frissíts több generáláshoz!`,
      features: [
        "Több havi AI generálás",
        "Fejlettebb AI funkciók",
        "Prioritásos feldolgozás",
      ],
    },
  };

  const { icon: Icon, title, description, features } = content[limitType];

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10">
                <ArrowRight className="h-3 w-3 text-success" />
              </div>
              <span className="text-sm text-foreground">{feature}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleUpgrade} className="w-full">
            Csomagok megtekintése
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Később
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
