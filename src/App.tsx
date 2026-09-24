// App entry point
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import HistoricoPage from "./pages/HistoricoPage";
import ProyeccionPage from "./pages/ProyeccionPage";
import ActividadDetailPage from "./pages/ActividadDetailPage";
import ReportesPage from "./pages/ReportesPage";
import CalendarioPage from "./pages/CalendarioPage";
import LoginPage from "./pages/LoginPage";
import RegistroPage from "./pages/RegistroPage";
import AdminPage from "./pages/AdminPage";
import Prep54Page from "./pages/Prep54Page";
import ImportarPage from "./pages/ImportarPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route path="/" element={<ProtectedRoute allowedRoles={["admin", "operativo", "invitado"]}><Index /></ProtectedRoute>} />
            <Route path="/historico" element={<ProtectedRoute allowedRoles={["admin", "operativo"]}><HistoricoPage /></ProtectedRoute>} />
            <Route path="/proyeccion" element={<ProtectedRoute allowedRoles={["admin", "operativo", "invitado"]}><ProyeccionPage /></ProtectedRoute>} />
            <Route path="/actividad/:id" element={<ProtectedRoute allowedRoles={["admin", "operativo"]}><ActividadDetailPage /></ProtectedRoute>} />
            <Route path="/reportes" element={<Navigate to="/reportes/32" replace />} />
            <Route path="/reportes/:section" element={<ProtectedRoute><ReportesPage /></ProtectedRoute>} />
            <Route path="/calendario" element={<ProtectedRoute allowedRoles={["admin", "operativo", "invitado"]}><CalendarioPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPage /></ProtectedRoute>} />
            <Route path="/prep54" element={<ProtectedRoute allowedRoles={["admin", "operativo"]}><Prep54Page /></ProtectedRoute>} />
            <Route path="/importar" element={<ProtectedRoute allowedRoles={["admin"]}><ImportarPage /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
