import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderOpen, FileText, Flame, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useProjects } from "@/hooks/useProjects";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useWritingStats } from "@/hooks/useWritingStats";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { EmptyState } from "@/components/dashboard/EmptyState";

import { WritingStatusCard } from "@/components/dashboard/WritingStatusCard";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { SuccessModal } from "@/components/subscription/SuccessModal";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { OfflineIndicator } from "@/components/mobile/OfflineIndicator";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { InstallPWAPrompt } from "@/components/mobile/InstallPWAPrompt";
import { ProjectLoadingScreen } from "@/components/loading/ProjectLoadingScreen";

import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { OnboardingTour } from "@/components/ui/onboarding-tour";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { RetryError } from "@/components/ui/retry-error";
import { BugReportFab } from "@/components/support/BugReportFab";
import { ReferralBanner } from "@/components/dashboard/ReferralBanner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const { isCollapsed, toggle } = useSidebarState();
  const { projects, isLoading, error, refetch, deleteProject, archiveProject, unarchiveProject } = useProjects();
  const { subscription, usage, isProjectLimitReached } = useSubscription();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileTab, setMobileTab] = useState<"home" | "projects" | "settings">("home");
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"recent" | "name_asc" | "name_desc" | "words_desc" | "words_asc">("recent");
  const ITEMS_PER_PAGE = 12;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isOnline, pendingChanges, saveLastProject } = useOfflineSync();
  const { streak, getTodayWords, goals } = useWritingStats();

  // Get the project being loaded for showing its title
  const loadingProject = useMemo(() => {
    if (!loadingProjectId) return null;
    return projects.find((p) => p.id === loadingProjectId);
  }, [loadingProjectId, projects]);

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

  // Calculate stats (excluding archived projects)
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== "archived");
    const totalProjects = activeProjects.length;
    const totalWords = activeProjects.reduce((sum, p) => sum + (p.word_count || 0), 0);
    const todayWords = getTodayWords();
    const currentStreak = streak?.current_streak || 0;
    return { totalProjects, totalWords, todayWords, currentStreak };
  }, [projects, getTodayWords, streak]);

  // Sidebar project list (includes all statuses for sidebar grouping)
  const sidebarProjects = useMemo(() => {
    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status as "active" | "completed" | "archived",
    }));
  }, [projects]);

  // Aktív háttérírások (csak könyvek, nem mesekönyvek)
  const activeWritingProjects = useMemo(() => {
    return projects.filter(p => 
      // Csak könyvek (nem mesekönyv)
      p.genre !== "mesekonyv" &&
      // Aktív írási státusz (nem kész és nem failed)
      p.writing_status && 
      ['queued', 'generating_outlines', 'writing', 'in_progress'].includes(p.writing_status)
    );
  }, [projects]);

  // Transform database projects to card format (exclude archived for main view)
  const cardProjects = useMemo(() => {
    return projects
      .filter((p) => p.status !== "archived")
      .sort((a, b) => {
        // In-progress projects go to the top
        if (a.writing_status === "in_progress" && b.writing_status !== "in_progress") return -1;
        if (b.writing_status === "in_progress" && a.writing_status !== "in_progress") return 1;
        // Keep original order (by updated_at from API)
        return 0;
      })
      .map((p) => ({
        id: p.id,
        title: p.title,
        genre: p.genre as "szakkönyv" | "fiction" | "erotikus" | "mesekonyv" | "egyéb",
        wordCount: p.word_count || 0,
        targetWordCount: p.target_word_count || 50000,
        lastEditedAt: new Date(p.updated_at),
        writingStatus: p.writing_status,
        writingMode: p.writing_mode,
        backgroundError: p.background_error,
        status: p.status,
        coverUrl: (p as any).selected_cover_url || null,
      }));
  }, [projects]);

  // Összes könyv rendezve (könyv + mesekönyv együtt)
  const allBooks = useMemo(() => {
    let sorted = [...cardProjects];
    
    switch (sortBy) {
      case "recent":
        sorted.sort((a, b) => b.lastEditedAt.getTime() - a.lastEditedAt.getTime());
        break;
      case "name_asc":
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'hu'));
        break;
      case "name_desc":
        sorted.sort((a, b) => b.title.localeCompare(a.title, 'hu'));
        break;
      case "words_desc":
        sorted.sort((a, b) => b.wordCount - a.wordCount);
        break;
      case "words_asc":
        sorted.sort((a, b) => a.wordCount - b.wordCount);
        break;
    }
    
    return sorted;
  }, [cardProjects, sortBy]);

  // Lapozott projektek
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allBooks.slice(start, start + ITEMS_PER_PAGE);
  }, [allBooks, currentPage]);

  const totalPages = Math.ceil(allBooks.length / ITEMS_PER_PAGE);

  const handleSortChange = (value: "recent" | "name_asc" | "name_desc" | "words_desc" | "words_asc") => {
    setSortBy(value);
    setCurrentPage(1);
  };

  // Handlers
  const handleNewProject = () => {
    if (isProjectLimitReached()) {
      setIsUpgradeModalOpen(true);
      return;
    }
    // Clear ALL wizard states to ensure a fresh project creation
    sessionStorage.removeItem("book-wizard-data");
    sessionStorage.removeItem("storybook-wizard-data");
    navigate("/create-book");
  };

  const handleProjectSelect = (id: string) => {
    saveLastProject(id);
    navigate(`/project/${id}`);
  };

  const handleProjectOpen = (id: string) => {
    saveLastProject(id);
    setLoadingProjectId(id);
  };

  const handleLoadingComplete = () => {
    if (loadingProjectId && loadingProject) {
      // Mesekönyv → wizard utolsó lépése (előnézet), ahol lapozhatja
      if (loadingProject.genre === "mesekonyv") {
        navigate(`/create-storybook?projectId=${loadingProjectId}`);
      } else {
        navigate(`/project/${loadingProjectId}`);
      }
      setLoadingProjectId(null);
    } else if (loadingProjectId) {
      // Fallback if loadingProject is not available
      navigate(`/project/${loadingProjectId}`);
      setLoadingProjectId(null);
    }
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

  const handleArchiveProject = async (id: string) => {
    const success = await archiveProject(id);
    if (success) {
      toast.success("Projekt archiválva");
    } else {
      toast.error("Hiba történt az archiválás során");
    }
  };

  const handleUnarchiveProject = async (id: string) => {
    const success = await unarchiveProject(id);
    if (success) {
      toast.success("Projekt visszaállítva");
    } else {
      toast.error("Hiba történt a visszaállítás során");
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


  // Loading screen (shown for both mobile and desktop)
  if (loadingProjectId) {
    return (
      <ProjectLoadingScreen
        projectTitle={loadingProject?.title}
        onComplete={handleLoadingComplete}
      />
    );
  }

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
              title="Összes könyv"
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

              {/* Aktív írások mobil nézeten */}
              {activeWritingProjects.length > 0 && (
                <div className="mb-6">
                  <h2 className="mb-3 text-lg font-semibold text-foreground">
                    Folyamatban lévő írások
                  </h2>
                  <div className="mobile-card-stack">
                    {activeWritingProjects.map((project) => (
                      <WritingStatusCard
                        key={project.id}
                        projectId={project.id}
                        projectTitle={project.title}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Books section */}
              <div className="mb-6">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Könyveim</h2>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <ArrowUpDown className="mr-1 h-3 w-3" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Legutóbbi</SelectItem>
                      <SelectItem value="name_asc">Név A-Z</SelectItem>
                      <SelectItem value="name_desc">Név Z-A</SelectItem>
                      <SelectItem value="words_desc">Szószám ↓</SelectItem>
                      <SelectItem value="words_asc">Szószám ↑</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <div className="mobile-card-stack">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-32 animate-pulse rounded-xl bg-muted"
                      />
                    ))}
                  </div>
                ) : allBooks.length === 0 ? (
                  <EmptyState onCreateProject={handleNewProject} />
                ) : (
                  <>
                    <div className="mobile-card-stack">
                      {paginatedBooks.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onOpen={handleProjectOpen}
                          onDelete={handleProjectDeleteRequest}
                          onArchive={handleArchiveProject}
                          onRename={refetch}
                        />
                      ))}
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <Pagination className="mt-4">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
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

      {/* Upgrade Modal */}
      <UpgradeModal
        open={isUpgradeModalOpen}
        onOpenChange={setIsUpgradeModalOpen}
        limitType="projects"
        currentLimit={subscription?.projectLimit || 1}
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
        onArchiveProject={handleArchiveProject}
        onUnarchiveProject={handleUnarchiveProject}
        onDeleteProject={handleProjectDeleteRequest}
        projectLimitReached={isProjectLimitReached()}
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
              title="Összes könyv"
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

          {/* Referral Banner */}
          <div className="mb-8">
            <ReferralBanner />
          </div>

          {activeWritingProjects.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                Folyamatban lévő írások
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeWritingProjects.map((project) => (
                  <WritingStatusCard
                    key={project.id}
                    projectId={project.id}
                    projectTitle={project.title}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Books section - full width */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Könyveim</h2>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[160px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Legutóbbi</SelectItem>
                  <SelectItem value="name_asc">Név A-Z</SelectItem>
                  <SelectItem value="name_desc">Név Z-A</SelectItem>
                  <SelectItem value="words_desc">Szószám ↓</SelectItem>
                  <SelectItem value="words_asc">Szószám ↑</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : allBooks.length === 0 ? (
              <EmptyState onCreateProject={handleNewProject} />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedBooks.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={handleProjectOpen}
                      onDelete={handleProjectDeleteRequest}
                      onArchive={handleArchiveProject}
                      onRename={refetch}
                    />
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination className="mt-6">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
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

      {/* Upgrade Modal */}
      <UpgradeModal
        open={isUpgradeModalOpen}
        onOpenChange={setIsUpgradeModalOpen}
        limitType="projects"
        currentLimit={subscription?.projectLimit || 1}
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

      {/* Bug Report FAB */}
      <BugReportFab />

      {/* Onboarding Tour */}
      <OnboardingTour />
    </div>
  );
}
