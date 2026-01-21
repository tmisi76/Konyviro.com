import { useState, useMemo } from "react";
import { FolderOpen, FileText, PenLine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarState } from "@/hooks/useSidebarState";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProjectCard, type Project } from "@/components/dashboard/ProjectCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { toast } from "sonner";

// Mock data for demonstration
const mockProjects: Project[] = [
  {
    id: "1",
    title: "A jövő marketingje: AI és automatizáció",
    genre: "szakkönyv",
    wordCount: 15420,
    targetWordCount: 50000,
    lastEditedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: "2",
    title: "Éjféli vallomások",
    genre: "erotikus",
    wordCount: 32100,
    targetWordCount: 60000,
    lastEditedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: "3",
    title: "A kódfejtő - Sci-fi thriller",
    genre: "fiction",
    wordCount: 8750,
    targetWordCount: 80000,
    lastEditedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  },
  {
    id: "4",
    title: "Startup alapítás lépésről lépésre",
    genre: "szakkönyv",
    wordCount: 45000,
    targetWordCount: 45000,
    lastEditedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { isCollapsed, toggle } = useSidebarState();
  const [projects, setProjects] = useState<Project[]>(mockProjects);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Író";

  // Calculate stats
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalWords = projects.reduce((sum, p) => sum + p.wordCount, 0);
    // Mock weekly writing (would come from real data)
    const weeklyWriting = 4250;

    return { totalProjects, totalWords, weeklyWriting };
  }, [projects]);

  // Sidebar project list
  const sidebarProjects = useMemo(() => {
    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.wordCount >= p.targetWordCount ? "completed" : "active",
    })) as { id: string; title: string; status: "active" | "completed" }[];
  }, [projects]);

  // Handlers
  const handleNewProject = () => {
    toast.info("Új projekt létrehozása hamarosan elérhető!");
  };

  const handleProjectSelect = (id: string) => {
    toast.info(`Projekt megnyitása: ${id}`);
  };

  const handleProjectOpen = (id: string) => {
    toast.info(`Projekt megnyitása: ${id}`);
  };

  const handleProjectDelete = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success("Projekt törölve");
  };

  const handleSettings = () => {
    toast.info("Beállítások hamarosan elérhetőek!");
  };

  // Recent projects (sorted by last edited)
  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => b.lastEditedAt.getTime() - a.lastEditedAt.getTime())
      .slice(0, 6);
  }, [projects]);

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <DashboardSidebar
        isCollapsed={isCollapsed}
        onToggle={toggle}
        projects={sidebarProjects}
        onNewProject={handleNewProject}
        onProjectSelect={handleProjectSelect}
        onSettings={handleSettings}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
          {/* Welcome message */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
              Üdv újra, {userName}!
            </h1>
            <p className="mt-1 text-muted-foreground">
              Folytasd az írást ott, ahol abbahagytad.
            </p>
          </div>

          {/* Stats cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatsCard
              title="Összes projekt"
              value={stats.totalProjects}
              icon={FolderOpen}
            />
            <StatsCard
              title="Összes szó"
              value={stats.totalWords.toLocaleString("hu-HU")}
              icon={FileText}
            />
            <StatsCard
              title="Heti írás"
              value={stats.weeklyWriting.toLocaleString("hu-HU")}
              subtitle="szó"
              icon={PenLine}
              trend={{ value: 12, isPositive: true }}
            />
          </div>

          {/* Projects section */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Legutóbbi projektek
            </h2>

            {projects.length === 0 ? (
              <EmptyState onCreateProject={handleNewProject} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={handleProjectOpen}
                    onDelete={handleProjectDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
