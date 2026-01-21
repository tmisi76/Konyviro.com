import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-material-1">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">KönyvÍró AI</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Kijelentkezés
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-2xl bg-card p-8 shadow-material-2">
            <h2 className="text-2xl font-bold text-foreground">
              Üdvözlünk, {user?.user_metadata?.full_name || "Író"}!
            </h2>
            <p className="mt-4 text-muted-foreground">
              A KönyvÍró AI dashboard fejlesztés alatt áll. Hamarosan itt
              találod majd a projektjeidet és az AI író eszközöket.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button className="bg-primary hover:bg-primary/90">
                Új projekt indítása
              </Button>
              <Button variant="outline">Projektek böngészése</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}