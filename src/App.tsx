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
import Relatorios from "./pages/Relatorios";
import TiposAssistencia from "./pages/TiposAssistencia";
import Notificacoes from "./pages/Notificacoes";
import Auth from "./pages/Auth";
import SupplierPortal from "./pages/SupplierPortal";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
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
              path="/relatorios" 
              element={
                <ProtectedRoute>
                  <DashboardLayout><Relatorios /></DashboardLayout>
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
              path="/notificacoes" 
              element={
                <ProtectedRoute>
                  <DashboardLayout><Notificacoes /></DashboardLayout>
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
);

export default App;
