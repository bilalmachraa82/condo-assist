
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Assistencias from "./pages/Assistencias";
import Edificios from "./pages/Edificios";
import Fornecedores from "./pages/Fornecedores";
import Quotations from "./pages/Quotations";
import Configuracoes from "./pages/Configuracoes";
import Security from "./pages/Security";
import TiposAssistencia from "./pages/TiposAssistencia";
import Comunicacoes from "./pages/Comunicacoes";
import Analytics from "./pages/Analytics";
import EmailTesting from "./pages/EmailTesting";
import FollowUps from "./pages/FollowUps";
import FollowUpTesting from "./pages/FollowUpTesting";
import Auth from "./pages/Auth";
import SupplierPortal from "./pages/SupplierPortal";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ErrorBoundary from "./components/error/ErrorBoundary";
import { showErrorToast } from "./utils/errorHandler";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showErrorToast(errorMessage);
      },
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/supplier-portal" element={<SupplierPortal />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><Dashboard /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/assistencias" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><Assistencias /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/edificios"
                element={
                  <ProtectedRoute>
                    <DashboardLayout><Edificios /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/fornecedores" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><Fornecedores /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/orcamentos" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><Quotations /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/configuracoes" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><Configuracoes /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seguranca" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><Security /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/relatorios" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><Analytics /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tipos-assistencia" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><TiposAssistencia /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/comunicacoes" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><Comunicacoes /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><Analytics /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/email-testing" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><EmailTesting /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/follow-ups" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><FollowUps /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/follow-up-testing" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout><FollowUpTesting /></DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
