import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const mode = searchParams.get("mode");
  
  // SZINKRON inicializálás - nincs race condition!
  const [showPasswordReset, setShowPasswordReset] = useState(mode === "reset");

  useEffect(() => {
    // PASSWORD_RECOVERY event figyelése (backup)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setShowPasswordReset(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Csak akkor redirect, ha BIZTOSAN nem reset mode
    if (!loading && user && !showPasswordReset && mode !== "reset") {
      navigate("/dashboard");
    }
  }, [user, loading, navigate, showPasswordReset, mode]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">KönyvÍró AI</h1>
          <p className="mt-2 text-muted-foreground">
            {showPasswordReset 
              ? "Állítsd be az új jelszavadat"
              : "Írj könyveket mesterséges intelligenciával"
            }
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl bg-card p-6 shadow-material-3 sm:p-8">
          {showPasswordReset ? (
            <>
              <h2 className="mb-6 text-xl font-semibold text-center text-foreground">
                Új jelszó beállítása
              </h2>
              <ResetPasswordForm />
            </>
          ) : (
            <>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="text-sm font-medium">
                    Bejelentkezés
                  </TabsTrigger>
                  <TabsTrigger value="register" className="text-sm font-medium">
                    Regisztráció
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <LoginForm />
                </TabsContent>

                <TabsContent value="register" className="mt-0">
                  <RegisterForm />
                </TabsContent>
              </Tabs>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">vagy</span>
                </div>
              </div>

              {/* Google OAuth */}
              <GoogleAuthButton />
            </>
          )}
        </div>

        {/* Footer */}
        {!showPasswordReset && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            A regisztrációval elfogadod az{" "}
            <a href="#" className="underline hover:text-foreground">
              Általános Szerződési Feltételeket
            </a>{" "}
            és az{" "}
            <a href="#" className="underline hover:text-foreground">
              Adatvédelmi Irányelveket
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
