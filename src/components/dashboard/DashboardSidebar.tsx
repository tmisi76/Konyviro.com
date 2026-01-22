import { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  FolderOpen, 
  CheckCircle2, 
  Settings, 
  LogOut,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
  id: string;
  title: string;
  status: "active" | "completed";
}

interface DashboardSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  projects: Project[];
  onNewProject: () => void;
  onProjectSelect: (id: string) => void;
  onSettings: () => void;
  onArchiveProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
}

export function DashboardSidebar({
  isCollapsed,
  onToggle,
  projects,
  onNewProject,
  onProjectSelect,
  onSettings,
  onArchiveProject,
  onDeleteProject,
}: DashboardSidebarProps) {
  const { user, signOut } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    active: true,
    completed: false,
  });

  const activeProjects = projects.filter((p) => p.status === "active");
  const completedProjects = projects.filter((p) => p.status === "completed");

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Író";
  const userInitial = userName.charAt(0).toUpperCase();

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-card shadow-sm hover:bg-muted"
        aria-label={isCollapsed ? "Kinyitás" : "Összecsukás"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* User section */}
      <div className={cn("border-b border-sidebar-border p-4", isCollapsed && "flex justify-center")}>
        <div className={cn("flex items-center gap-3", isCollapsed && "flex-col gap-2")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-semibold">
            {userInitial}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* New project button */}
      <div className={cn("p-4", isCollapsed && "flex justify-center")}>
        <Button
          onClick={onNewProject}
          className={cn(
            "w-full bg-secondary text-secondary-foreground hover:bg-secondary/90",
            isCollapsed && "w-10 p-0"
          )}
        >
          <Plus className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
          {!isCollapsed && "Új projekt"}
        </Button>
      </div>

      {/* Projects list */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* Active projects */}
        <ProjectGroup
          title="Aktív"
          icon={FolderOpen}
          projects={activeProjects}
          isExpanded={expandedGroups.active}
          onToggle={() => toggleGroup("active")}
          onProjectSelect={onProjectSelect}
          isCollapsed={isCollapsed}
          onArchiveProject={onArchiveProject}
          onDeleteProject={onDeleteProject}
        />

        {/* Completed projects */}
        <ProjectGroup
          title="Befejezett"
          icon={CheckCircle2}
          projects={completedProjects}
          isExpanded={expandedGroups.completed}
          onToggle={() => toggleGroup("completed")}
          onProjectSelect={onProjectSelect}
          isCollapsed={isCollapsed}
          onArchiveProject={onArchiveProject}
          onDeleteProject={onDeleteProject}
        />
      </div>

      {/* Bottom links */}
      <div className={cn("border-t border-sidebar-border p-2", isCollapsed && "flex flex-col items-center")}>
        <button
          onClick={onSettings}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isCollapsed && "justify-center px-2"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!isCollapsed && "Beállítások"}
        </button>
        <button
          onClick={signOut}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isCollapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && "Kijelentkezés"}
        </button>
      </div>
    </aside>
  );
}

interface ProjectGroupProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  projects: Project[];
  isExpanded: boolean;
  onToggle: () => void;
  onProjectSelect: (id: string) => void;
  isCollapsed: boolean;
  onArchiveProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
}

function ProjectGroup({
  title,
  icon: Icon,
  projects,
  isExpanded,
  onToggle,
  onProjectSelect,
  isCollapsed,
  onArchiveProject,
  onDeleteProject,
}: ProjectGroupProps) {
  if (isCollapsed) {
    return (
      <div className="mb-2 flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        {projects.slice(0, 3).map((project) => (
          <button
            key={project.id}
            onClick={() => onProjectSelect(project.id)}
            className="flex h-8 w-8 items-center justify-center rounded text-xs font-medium text-muted-foreground hover:bg-sidebar-accent"
            title={project.title}
          >
            {project.title.charAt(0).toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:bg-sidebar-accent"
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{title}</span>
        <span className="ml-auto text-xs">({projects.length})</span>
        <ChevronRight
          className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")}
        />
      </button>
      {isExpanded && (
        <div className="mt-1 space-y-0.5 pl-4">
          {projects.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Nincs projekt</p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="group/item flex w-full items-center justify-between rounded px-3 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <button
                  onClick={() => onProjectSelect(project.id)}
                  className="flex-1 truncate text-left"
                >
                  {project.title}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="ml-2 opacity-0 group-hover/item:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => onProjectSelect(project.id)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Szerkesztés
                    </DropdownMenuItem>
                    {onArchiveProject && (
                      <DropdownMenuItem onClick={() => onArchiveProject(project.id)}>
                        <Archive className="mr-2 h-3.5 w-3.5" />
                        Archiválás
                      </DropdownMenuItem>
                    )}
                    {onDeleteProject && (
                      <DropdownMenuItem
                        onClick={() => onDeleteProject(project.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Törlés
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
