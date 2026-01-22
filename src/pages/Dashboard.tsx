import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderOpen, FileText, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useProjects } from "@/hooks/useProjects";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useWritingStats } from "@/hooks/useWritingStats";
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
import { WritingStatsPanel } from "@/components/stats/WritingStatsPanel";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { OnboardingTour } from "@/components/ui/onboarding-tour";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { RetryError } from "@/components/ui/retry-error";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const { isCollapsed, toggle } = useSidebarState();
  const { projects, isLoading, error, refetch, deleteProject } = useProjects();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileTab, setMobileTab] = useState<"home" | "projects" | "settings">("home");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isOnline, pendingChanges, saveLastProject } = useOfflineSync();
  const { streak, getTodayWords, goals } = useWritingStats();

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
    const todayWords = getTodayWords();
    const currentStreak = streak?.current_streak || 0;
    return { totalProjects, totalWords, todayWords, currentStreak };
  }, [projects, getTodayWords, streak]);

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

  const handleProjectDeleteRequest = (id: string) => {
    setProjectToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    const success = await deleteProject(projectToDelete);
    setIsDeleting(false);
    setDeleteModalOpen(false);
    setProjectToDelete(null);
    if (success) {
      toast.success("Projekt sikeresen törölve");
    } else {
      toast.error("Hiba történt a törlés során. Próbáld újra!");
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
                  title="Mai írás"
                  value={stats.todayWords.toLocaleString("hu-HU")}
                  subtitle={`/ ${goals?.daily_word_goal || 500} cél`}
                  icon={FileText}
                />
                <StatsCard
                  title="Sorozat"
                  value={stats.currentStreak}
                  subtitle="nap"
                  icon={Flame}
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
                        onDelete={handleProjectDeleteRequest}
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

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={handleConfirmDelete}
          type="delete"
          title="Projekt törlése"
          description="Biztosan törlöd ezt a projektet? Az összes fejezet, karakter és tartalom véglegesen törlődik. Ez a művelet nem visszavonható."
          isLoading={isDeleting}
        />

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
              title="Mai írás"
              value={stats.todayWords.toLocaleString("hu-HU")}
              subtitle={`/ ${goals?.daily_word_goal || 500} cél`}
              icon={FileText}
            />
            <StatsCard
              title="Sorozat"
              value={stats.currentStreak}
              subtitle="nap"
              icon={Flame}
            />
          </div>

          {/* Writing Stats Panel */}
          <div className="mb-8">
            <WritingStatsPanel />
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
                    onDelete={handleProjectDeleteRequest}
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        type="delete"
        title="Projekt törlése"
        description="Biztosan törlöd ezt a projektet? Az összes fejezet, karakter és tartalom véglegesen törlődik. Ez a művelet nem visszavonható."
        isLoading={isDeleting}
      />

      {/* Onboarding Tour */}
      <OnboardingTour />
    </div>
  );
}
