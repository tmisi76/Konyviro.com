import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderOpen, FileText, PenLine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useProjects } from "@/hooks/useProjects";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { SuccessModal } from "@/components/subscription/SuccessModal";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const { isCollapsed, toggle } = useSidebarState();
  const { projects, isLoading, refetch, deleteProject } = useProjects();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Handle subscription success
  useEffect(() => {
    const subscription = searchParams.get("subscription");
    if (subscription === "success") {
      setIsSuccessModalOpen(true);
      // Remove the query param from URL
      searchParams.delete("subscription");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Író";

  // Calculate stats
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalWords = projects.reduce((sum, p) => sum + (p.word_count || 0), 0);
    // Mock weekly writing (would come from real data)
    const weeklyWriting = Math.round(totalWords * 0.1);

    return { totalProjects, totalWords, weeklyWriting };
  }, [projects]);

  // Sidebar project list
  const sidebarProjects = useMemo(() => {
    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status === "completed" ? "completed" : "active",
    })) as { id: string; title: string; status: "active" | "completed" }[];
  }, [projects]);

  // Transform database projects to card format
  const cardProjects = useMemo(() => {
    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      genre: p.genre as "szakkönyv" | "fiction" | "erotikus" | "egyéb",
      wordCount: p.word_count || 0,
      targetWordCount: p.target_word_count || 50000,
      lastEditedAt: new Date(p.updated_at),
    }));
  }, [projects]);

  // Handlers
  const handleNewProject = () => {
    setIsCreateModalOpen(true);
  };


  const handleProjectSelect = (id: string) => {
    navigate(`/project/${id}`);
  };

  const handleProjectOpen = (id: string) => {
    navigate(`/project/${id}`);
  };

  const handleProjectDelete = async (id: string) => {
    const success = await deleteProject(id);
    if (success) {
      toast.success("Projekt törölve");
    } else {
      toast.error("Hiba történt a törlés során");
    }
  };

  const handleSettings = () => {
    toast.info("Beállítások hamarosan elérhetőek!");
  };

  const handleProjectCreated = () => {
    refetch();
  };

  // Recent projects (sorted by last edited)
  const recentProjects = useMemo(() => {
    return [...cardProjects].slice(0, 6);
  }, [cardProjects]);

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
              trend={stats.weeklyWriting > 0 ? { value: 12, isPositive: true } : undefined}
            />
          </div>

          {/* Projects section */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {projects.length > 0 ? "Legutóbbi projektek" : "Projektek"}
            </h2>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : projects.length === 0 ? (
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

      {/* Create Project Modal */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleProjectCreated}
      />

      {/* Subscription Success Modal */}
      <SuccessModal
        open={isSuccessModalOpen}
        onOpenChange={setIsSuccessModalOpen}
      />
    </div>
  );
}
