import { Home, FolderOpen, Plus, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface MobileBottomNavProps {
  activeTab: "home" | "projects" | "settings";
  onTabChange: (tab: "home" | "projects" | "settings") => void;
  onNewProject: () => void;
}

export function MobileBottomNav({ activeTab, onTabChange, onNewProject }: MobileBottomNavProps) {
  const { user } = useAuth();
  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md pb-safe">
      <div className="flex items-center justify-around h-16">
        {/* Home */}
        <button
          onClick={() => onTabChange("home")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] min-h-[44px]",
            activeTab === "home" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs font-medium">Kezdőlap</span>
        </button>

        {/* Books */}
        <button
          onClick={() => onTabChange("projects")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] min-h-[44px]",
            activeTab === "projects" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <FolderOpen className="h-5 w-5" />
          <span className="text-xs font-medium">Könyveim</span>
        </button>

        {/* New Project FAB */}
        <button
          onClick={onNewProject}
          className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-secondary text-secondary-foreground shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Settings */}
        <button
          onClick={() => onTabChange("settings")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] min-h-[44px]",
            activeTab === "settings" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
          <span className="text-xs font-medium">Beállítások</span>
        </button>

        {/* Profile */}
        <button
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] min-h-[44px] text-muted-foreground"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
            {userInitial}
          </div>
          <span className="text-xs font-medium">Profil</span>
        </button>
      </div>
    </nav>
  );
}
