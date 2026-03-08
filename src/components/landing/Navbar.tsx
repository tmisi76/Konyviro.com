import { Button } from "@/components/ui/button";
import { BookOpen, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "@/i18n/I18nContext";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">KönyvÍró</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 md:flex">
            <button
              onClick={() => scrollToSection("features")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.nav.features}
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.nav.howItWorks}
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.nav.pricing}
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.nav.faq}
            </button>
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <Button onClick={() => navigate("/dashboard")}>
                {t.nav.dashboard}
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>
                  {t.nav.login}
                </Button>
                <Button onClick={() => navigate("/auth?mode=register")}>
                  {t.nav.register}
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-border py-4 md:hidden">
            <div className="flex flex-col gap-4">
              <button
                onClick={() => scrollToSection("features")}
                className="text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.nav.features}
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.nav.howItWorks}
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.nav.pricing}
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.nav.faq}
              </button>
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
                {user ? (
                  <Button onClick={() => navigate("/dashboard")} className="w-full">
                    {t.nav.dashboard}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => navigate("/auth")} className="w-full">
                      {t.nav.login}
                    </Button>
                    <Button onClick={() => navigate("/auth?mode=register")} className="w-full">
                      {t.nav.register}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
