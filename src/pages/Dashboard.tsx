import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderOpen, FileText, PenLine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useProjects } from "@/hooks/useProjects";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { SuccessModal } from "@/components/subscription/SuccessModal";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { OfflineIndicator } from "@/components/mobile/OfflineIndicator";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { InstallPWAPrompt } from "@/components/mobile/InstallPWAPrompt";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const { isCollapsed, toggle } = useSidebarState();
  const { projects, isLoading, refetch, deleteProject } = useProjects();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileTab, setMobileTab] = useState<"home" | "projects" | "settings">("home");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isOnline, pendingChanges, saveLastProject } = useOfflineSync();

  // Pull to refresh
  const handleRefresh = async () => {
    await refetch();
  };
  const { containerRef, pullDistance, isRefreshing, isPastThreshold } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  // Handle subscription success
  useEffect(() => {
    const subscription = searchParams.get("subscription");
    if (subscription === "success") {
      setIsSuccessModalOpen(true);
      searchParams.delete("subscription");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Író";

  // Calculate stats
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalWords = projects.reduce((sum, p) => sum + (p.word_count || 0), 0);
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
    saveLastProject(id);
    navigate(`/project/${id}`);
  };

  const handleProjectOpen = (id: string) => {
    saveLastProject(id);
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
    navigate("/settings?tab=subscription");
  };

  const handleProjectCreated = () => {
    refetch();
  };

  const handleMobileTabChange = (tab: "home" | "projects" | "settings") => {
    setMobileTab(tab);
    if (tab === "settings") {
      navigate("/settings");
    }
  };

  // Recent projects (sorted by last edited)
  const recentProjects = useMemo(() => {
    return [...cardProjects].slice(0, 6);
  }, [cardProjects]);

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex h-screen w-full flex-col bg-background">
        {/* Offline indicator */}
        <OfflineIndicator isOnline={isOnline} pendingChanges={pendingChanges} />

        {/* Main content with pull to refresh */}
        <PullToRefresh
          containerRef={containerRef}
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          isPastThreshold={isPastThreshold}
        >
          <main className="flex-1 has-bottom-nav">
            <div className="px-4 py-6">
              {/* Welcome message */}
              <div className="mb-6">
                <h1 className="text-xl font-bold text-foreground">
                  Üdv, {userName}!
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Folytasd az írást ott, ahol abbahagytad.
                </p>
              </div>

              {/* Stats cards - horizontal scroll */}
              <div className="mb-6 stats-scroll">
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
                  <div className="mobile-card-stack">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-32 animate-pulse rounded-xl bg-muted"
                      />
                    ))}
                  </div>
                ) : projects.length === 0 ? (
                  <EmptyState onCreateProject={handleNewProject} />
                ) : (
                  <div className="mobile-card-stack">
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
        </PullToRefresh>

        {/* Bottom navigation */}
        <MobileBottomNav
          activeTab={mobileTab}
          onTabChange={handleMobileTabChange}
          onNewProject={handleNewProject}
        />

        {/* Install PWA prompt */}
        <InstallPWAPrompt />

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

  // Desktop layout
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Offline indicator */}
      <OfflineIndicator isOnline={isOnline} pendingChanges={pendingChanges} />

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

      {/* Install PWA prompt */}
      <InstallPWAPrompt />

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
