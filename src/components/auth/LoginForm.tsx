import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("Hibás email vagy jelszó");
      } else {
        setError("Hiba történt a bejelentkezés során");
      }
      setLoading(false);
      return;
    }

    navigate("/dashboard");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Kérjük, add meg az email címed");
      return;
    }

    setResetLoading(true);
    const { error } = await resetPassword(resetEmail);
    setResetLoading(false);

    if (error) {
      toast.error("Hiba történt az email küldése során");
      return;
    }

    setResetSent(true);
    toast.success("Jelszó-visszaállító email elküldve!");
  };

  if (showForgotPassword) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setShowForgotPassword(false);
            setResetSent(false);
            setResetEmail("");
          }}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Vissza a bejelentkezéshez
        </button>

        {resetSent ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Email elküldve!</h3>
            <p className="text-muted-foreground text-sm">
              Ha a megadott email cím regisztrálva van nálunk, küldtünk egy linket a jelszó visszaállításához.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Nézd meg a spam mappát is!
            </p>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Elfelejtett jelszó</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add meg az email címed, és küldünk egy linket a jelszó visszaállításához.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-email">Email cím</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="pelda@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={resetLoading}
              className="w-full h-11 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold shadow-material-1"
            >
              {resetLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Küldés...
                </>
              ) : (
                "Jelszó visszaállítása"
              )}
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email cím</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="pelda@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Jelszó</Label>
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Elfelejtett jelszó?
          </button>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold shadow-material-1"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Bejelentkezés...
          </>
        ) : (
          "Bejelentkezés"
        )}
      </Button>
    </form>
  );
}
