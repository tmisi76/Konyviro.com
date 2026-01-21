import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { PricingSection } from "@/components/pricing/PricingSection";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const subscription = searchParams.get("subscription");
    if (subscription === "cancelled") {
      toast.info("Fizetés megszakítva. Bármikor visszatérhetsz!");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Vissza a főoldalra</span>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="sm">
              Bejelentkezés
            </Button>
          </Link>
        </div>
      </nav>

      {/* Pricing Section */}
      <PricingSection />

      {/* FAQ or additional info */}
      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h3 className="text-xl font-semibold text-foreground">
            Kérdésed van?
          </h3>
          <p className="mt-2 text-muted-foreground">
            Írj nekünk az{" "}
            <a href="mailto:hello@konyviro.ai" className="text-primary hover:underline">
              hello@konyviro.ai
            </a>{" "}
            címre, és 24 órán belül válaszolunk!
          </p>
        </div>
      </section>
    </div>
  );
}
