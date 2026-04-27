import { Link } from "react-router-dom";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { useWritingStyle } from "@/hooks/useWritingStyle";

interface StyleProfileBannerProps {
  className?: string;
}

/**
 * Diszkrét banner, amely a wizard / coach felület elején tájékoztatja a
 * felhasználót a Saját stílus funkcióról. Ha már van betanított profilja,
 * pozitív megerősítést kap; egyébként link a Beállítások → Saját stílus oldalra.
 */
export function StyleProfileBanner({ className = "" }: StyleProfileBannerProps) {
  const { hasStyleProfile, isLoading } = useWritingStyle();

  if (isLoading) return null;

  if (hasStyleProfile) {
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm ${className}`}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
        <p className="flex-1 text-foreground">
          <span className="font-medium">Saját stílusod aktív</span> — a könyved a te
          hangodon szólal meg.
        </p>
        <Link
          to="/settings?tab=style"
          className="text-xs font-medium text-primary hover:underline"
        >
          Kezelés
        </Link>
      </div>
    );
  }

  return (
    <Link
      to="/settings?tab=style"
      className={`group flex items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm transition-colors hover:bg-primary/10 ${className}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">Van saját írói stílusod?</p>
        <p className="text-xs text-muted-foreground">
          Tölts fel egy korábbi szöveget vagy PDF-et — a könyved a te
          stílusodban íródik.
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
