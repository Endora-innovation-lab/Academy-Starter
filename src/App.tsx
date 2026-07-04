import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";

const NotFound = lazy(() => import("./pages/NotFound"));
const InstituteRegister = lazy(() => import("./pages/InstituteRegister"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const InstituteDashboard = lazy(() => import("./pages/InstituteDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const PrincipalDashboard = lazy(() => import("./pages/PrincipalDashboard"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const Inactive = lazy(() => import("./pages/Inactive"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/register" element={<InstituteRegister />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/dashboard/institute" element={<InstituteDashboard />} />
              <Route path="/dashboard/teacher" element={<TeacherDashboard />} />
              <Route path="/dashboard/principal" element={<PrincipalDashboard />} />
              <Route path="/dashboard/student" element={<StudentDashboard />} />
              <Route path="/inactive" element={<Inactive />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
      <Analytics />
      <SpeedInsights />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
