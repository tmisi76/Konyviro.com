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