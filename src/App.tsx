import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import { SkipToContent } from "@/components/ui/accessibility";
import {
  KeyboardShortcutsModal,
  useKeyboardShortcuts,
} from "@/components/ui/keyboard-shortcuts-modal";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load heavy pages for performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjectEditor = lazy(() => import("./pages/ProjectEditor"));
const ProjectExport = lazy(() => import("./pages/ProjectExport"));
const Settings = lazy(() => import("./pages/Settings"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Install = lazy(() => import("./pages/Install"));
const CreateBook = lazy(() => import("./pages/CreateBook"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminProjects = lazy(() => import("./pages/admin/AdminProjects"));
const AdminProjectDetail = lazy(() => import("./pages/admin/AdminProjectDetail"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminAISettings = lazy(() => import("./pages/admin/AdminAISettings"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/AdminEmailTemplates"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminTicketDetail = lazy(() => import("./pages/admin/AdminTicketDetail"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminActivityLogs = lazy(() => import("./pages/admin/AdminActivityLogs"));
import { AdminLayout } from "@/layouts/AdminLayout";

const queryClient = new QueryClient();

function AppContent() {
  const { showShortcuts, setShowShortcuts } = useKeyboardShortcuts();

  return (
    <>
      <SkipToContent />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/pricing" element={
          <Suspense fallback={<FullPageLoader message="Árak betöltése..." />}>
            <Pricing />
          </Suspense>
        } />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Irányítópult betöltése..." />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-book"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Wizard betöltése..." />}>
                <CreateBook />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Szerkesztő betöltése..." />}>
                <ProjectEditor />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:id/export"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Exportálás betöltése..." />}>
                <ProjectExport />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Beállítások betöltése..." />}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/install" element={
          <Suspense fallback={<FullPageLoader />}>
            <Install />
          </Suspense>
        } />
        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminUsers />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminUserDetail />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminProjects />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminProjectDetail />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/billing"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminBilling />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/billing/plans"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminPlans />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ai-settings"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminAISettings />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/emails"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminEmailTemplates />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminSupport />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminTicketDetail />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminSettings />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminAnalytics />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageLoader message="Admin betöltése..." />}>
                <AdminLayout>
                  <AdminActivityLogs />
                </AdminLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <KeyboardShortcutsModal open={showShortcuts} onOpenChange={setShowShortcuts} />
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <main id="main-content">
              <AppContent />
            </main>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;