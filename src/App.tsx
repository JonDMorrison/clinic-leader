import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserNav } from "@/components/layout/UserNav";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { userTourService } from "@/lib/userTourService";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Scorecard from "./pages/Scorecard";
import Rocks from "./pages/Rocks";
import Issues from "./pages/Issues";
import L10 from "./pages/L10";
import Docs from "./pages/Docs";
import People from "./pages/People";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Imports from "./pages/Imports";
import Copilot from "./pages/Copilot";
import AILog from "./pages/AILog";
import AISettings from "./pages/AISettings";
import Reports from "./pages/Reports";
import ReportView from "./pages/ReportView";
import Branding from "./pages/Branding";
import Licensing from "./pages/Licensing";
import ImportUsers from "./pages/ImportUsers";
import ImportKpis from "./pages/ImportKpis";
import ImportSops from "./pages/ImportSops";
import OrganizationSettings from "./pages/OrganizationSettings";
import ImportMapping from "./pages/ImportMapping";
import OnboardingAnalytics from "./pages/OnboardingAnalytics";
import JaneIntegration from "./pages/JaneIntegration";
import Recalls from "./pages/Recalls";
import Integrations from "./pages/Integrations";
import SystemHealth from "./pages/SystemHealth";
import VTO from "./pages/VTO";
import VTOVision from "./pages/VTOVision";
import VTOTraction from "./pages/VTOTraction";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full min-h-screen relative">
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <header className="h-16 border-b border-border/40 flex items-center justify-end px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <UserNav />
      </header>
      <main className="flex-1 p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  </div>
);

const App = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkTourStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        
        // Check localStorage first to avoid showing wizard if already completed
        const localStorageKey = `tour_completed_${user.id}`;
        const completedInStorage = localStorage.getItem(localStorageKey);
        
        if (completedInStorage === "true") {
          return; // Don't show wizard
        }
        
        const tourStatus = await userTourService.getTourStatus(user.id);
        
        if (!tourStatus) {
          // New user, start tour
          const newTourStatus = await userTourService.startTour(user.id);
          if (newTourStatus && !newTourStatus.completed) {
            setShowWizard(true);
          }
        } else if (!tourStatus.completed) {
          // Tour in progress
          setShowWizard(true);
        } else {
          // Tour completed, store in localStorage
          localStorage.setItem(localStorageKey, "true");
        }
      }
    };

    checkTourStatus();
  }, []);

  const handleWizardComplete = async () => {
    setShowWizard(false);
    
    // Store completion in localStorage as backup
    if (userId) {
      const localStorageKey = `tour_completed_${userId}`;
      localStorage.setItem(localStorageKey, "true");
    }
  };

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<AppLayout><Home /></AppLayout>} />
            <Route path="/scorecard" element={<AppLayout><Scorecard /></AppLayout>} />
            <Route path="/rocks" element={<AppLayout><Rocks /></AppLayout>} />
            <Route path="/issues" element={<AppLayout><Issues /></AppLayout>} />
            <Route path="/meeting" element={<AppLayout><L10 /></AppLayout>} />
            <Route path="/docs" element={<AppLayout><Docs /></AppLayout>} />
            <Route path="/recalls" element={<AppLayout><Recalls /></AppLayout>} />
            <Route path="/people" element={<AppLayout><People /></AppLayout>} />
            <Route path="/vto" element={<AppLayout><VTO /></AppLayout>} />
            <Route path="/vto/vision" element={<AppLayout><VTOVision /></AppLayout>} />
            <Route path="/vto/traction" element={<AppLayout><VTOTraction /></AppLayout>} />
            <Route path="/imports" element={<AppLayout><Imports /></AppLayout>} />
            <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
            <Route path="/reports/:id" element={<AppLayout><ReportView /></AppLayout>} />
            <Route path="/copilot" element={<AppLayout><Copilot /></AppLayout>} />
            <Route path="/ai-log" element={<AppLayout><AILog /></AppLayout>} />
            <Route path="/ai-settings" element={<AppLayout><AISettings /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            <Route path="/branding" element={<AppLayout><Branding /></AppLayout>} />
            <Route path="/licensing" element={<AppLayout><Licensing /></AppLayout>} />
            <Route path="/imports/users" element={<AppLayout><ImportUsers /></AppLayout>} />
            <Route path="/imports/kpis" element={<AppLayout><ImportKpis /></AppLayout>} />
            <Route path="/imports/sops" element={<AppLayout><ImportSops /></AppLayout>} />
            <Route path="/imports/mapping" element={<AppLayout><ImportMapping /></AppLayout>} />
            <Route path="/settings/organization" element={<AppLayout><OrganizationSettings /></AppLayout>} />
            <Route path="/settings/integrations" element={<AppLayout><Integrations /></AppLayout>} />
            <Route path="/settings/integrations/jane" element={<AppLayout><JaneIntegration /></AppLayout>} />
            <Route path="/admin/onboarding-analytics" element={<AppLayout><OnboardingAnalytics /></AppLayout>} />
            <Route path="/admin/system-health" element={<AppLayout><SystemHealth /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {showWizard && userId && (
            <OnboardingWizard userId={userId} onComplete={handleWizardComplete} />
          )}
        </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
