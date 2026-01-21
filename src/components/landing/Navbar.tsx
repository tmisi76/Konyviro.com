import { Button } from "@/components/ui/button";
import { BookOpen, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

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
              Funkciók
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Hogyan működik
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Árazás
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              GYIK
            </button>
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Button onClick={() => navigate("/dashboard")}>
                Irányítópult
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>
                  Bejelentkezés
                </Button>
                <Button onClick={() => navigate("/auth?mode=register")}>
                  Ingyenes próba
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
                Funkciók
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Hogyan működik
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Árazás
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                GYIK
              </button>
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
                {user ? (
                  <Button onClick={() => navigate("/dashboard")} className="w-full">
                    Irányítópult
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => navigate("/auth")} className="w-full">
                      Bejelentkezés
                    </Button>
                    <Button onClick={() => navigate("/auth?mode=register")} className="w-full">
                      Ingyenes próba
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
