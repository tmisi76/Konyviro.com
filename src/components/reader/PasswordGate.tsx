import { useState } from "react";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PasswordGateProps {
  bookTitle: string;
  onVerify: (password: string) => Promise<boolean>;
}

export function PasswordGate({ bookTitle, onVerify }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsVerifying(true);
    setError("");

    try {
      const isValid = await onVerify(password);
      if (!isValid) {
        setError("Hibás jelszó");
        setPassword("");
      }
    } catch {
      setError("Hiba történt az ellenőrzés során");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Jelszóval védett könyv</CardTitle>
          <CardDescription>
            A(z) „{bookTitle}" könyv megtekintéséhez add meg a jelszót
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Jelszó"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isVerifying || !password.trim()}>
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Belépés
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
