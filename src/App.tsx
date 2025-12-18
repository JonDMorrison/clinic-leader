import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserNav } from "@/components/layout/UserNav";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import { userTourService } from "@/lib/userTourService";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDemoProvisioning } from "@/hooks/useDemoProvisioning";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Scorecard from "./pages/Scorecard";
import Rocks from "./pages/Rocks";
import Issues from "./pages/Issues";
import L10 from "./pages/L10";
import Meetings from "./pages/Meetings";
import MeetingDetail from "./pages/MeetingDetail";
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
import ImportMonthlyReport from "./pages/ImportMonthlyReport";
import OrganizationSettings from "./pages/OrganizationSettings";

import OnboardingAnalytics from "./pages/OnboardingAnalytics";
import JaneIntegration from "./pages/JaneIntegration";
import Recalls from "./pages/Recalls";
import Integrations from "./pages/Integrations";
import SystemHealth from "./pages/SystemHealth";
import AdminDemo from "./pages/AdminDemo";
import VTO from "./pages/VTO";
import VTOVision from "./pages/VTOVision";
import VTOHistory from "./pages/VTOHistory";
import Onboarding from "./pages/Onboarding";
import LibraryDetail from "./pages/LibraryDetail";
import AdminImpersonate from "./pages/AdminImpersonate";
import AdminDashboard from "./pages/AdminDashboard";
import DocumentUploadAdmin from "./pages/DocumentUploadAdmin";
import ScorecardSetup from "./pages/ScorecardSetup";
import ScorecardUpdate from "./pages/ScorecardUpdate";
import TeamManagement from "./pages/TeamManagement";
import ResetOrganization from "./pages/ResetOrganization";
import AdminAddUser from "./pages/AdminAddUser";
import AdminUsers from "./pages/AdminUsers";
import AdminIngestion from "./pages/AdminIngestion";
import SetPassword from "./pages/SetPassword";
import AdminPasswordDiagnostic from "./pages/AdminPasswordDiagnostic";
import ImportPdfReport from "./pages/ImportPdfReport";
import ScorecardTemplate from "./pages/ScorecardTemplate";
import ScorecardOffTrack from "./pages/ScorecardOffTrack";
import ScorecardCutover from "./pages/ScorecardCutover";
import RocksMonthlyReview from "./pages/RocksMonthlyReview";
import QuarterlyCloseReport from "./pages/QuarterlyCloseReport";
import Focus from "./pages/Focus";
import ProfileSettings from "./pages/ProfileSettings";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full min-h-screen relative">
    <Sidebar />
    <div className="flex-1 flex flex-col relative">
      <div className="fixed top-4 right-8 z-50">
        <UserNav />
      </div>
      <main className="flex-1 p-8 pt-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  </div>
);

const App = () => {
  // Auto-provision demo for whitelisted users
  useDemoProvisioning();
  
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
          <ImpersonationBanner />
          <BrowserRouter>
          <ErrorBoundary>
          <OnboardingGuard>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<AppLayout><Home /></AppLayout>} />
            <Route path="/scorecard/setup" element={<AppLayout><ScorecardSetup /></AppLayout>} />
            <Route path="/scorecard/update" element={<AppLayout><ScorecardUpdate /></AppLayout>} />
            <Route path="/scorecard/template" element={<AppLayout><ScorecardTemplate /></AppLayout>} />
            <Route path="/scorecard/off-track" element={<AppLayout><ScorecardOffTrack /></AppLayout>} />
            <Route path="/scorecard/cutover" element={<AppLayout><ScorecardCutover /></AppLayout>} />
            <Route path="/scorecard" element={<AppLayout><Scorecard /></AppLayout>} />
            <Route path="/rocks" element={<AppLayout><Rocks /></AppLayout>} />
            <Route path="/rocks/monthly-review" element={<AppLayout><RocksMonthlyReview /></AppLayout>} />
            <Route path="/rocks/quarterly-close" element={<AppLayout><QuarterlyCloseReport /></AppLayout>} />
            <Route path="/focus" element={<AppLayout><Focus /></AppLayout>} />
            <Route path="/issues" element={<AppLayout><Issues /></AppLayout>} />
            <Route path="/meeting" element={<AppLayout><L10 /></AppLayout>} />
            <Route path="/meetings" element={<AppLayout><Meetings /></AppLayout>} />
            <Route path="/meetings/:id" element={<AppLayout><MeetingDetail /></AppLayout>} />
            <Route path="/library/:id" element={<AppLayout><LibraryDetail /></AppLayout>} />
            <Route path="/recalls" element={<AppLayout><Recalls /></AppLayout>} />
            <Route path="/people" element={<AppLayout><People /></AppLayout>} />
            <Route path="/docs" element={<AppLayout><Docs /></AppLayout>} />
              <Route path="/vto" element={<AppLayout><VTO /></AppLayout>} />
              <Route path="/vto/vision" element={<AppLayout><VTOVision /></AppLayout>} />
              <Route path="/vto/history" element={<AppLayout><VTOHistory /></AppLayout>} />
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
            <Route path="/imports/monthly-report" element={<AppLayout><ImportMonthlyReport /></AppLayout>} />
            <Route path="/imports/pdf-report" element={<AppLayout><ImportPdfReport /></AppLayout>} />
            
            <Route path="/settings/organization" element={<AppLayout><OrganizationSettings /></AppLayout>} />
            <Route path="/settings/profile" element={<AppLayout><ProfileSettings /></AppLayout>} />
            <Route path="/settings/team" element={<AppLayout><TeamManagement /></AppLayout>} />
            <Route path="/settings/integrations" element={<AppLayout><Integrations /></AppLayout>} />
            <Route path="/settings/integrations/jane" element={<AppLayout><JaneIntegration /></AppLayout>} />
            <Route path="/admin/onboarding-analytics" element={<AppLayout><OnboardingAnalytics /></AppLayout>} />
            <Route path="/admin" element={<AppLayout><AdminDashboard /></AppLayout>} />
            <Route path="/admin/upload-docs" element={<AppLayout><DocumentUploadAdmin /></AppLayout>} />
            <Route path="/admin/ingestion" element={<AppLayout><AdminIngestion /></AppLayout>} />
            <Route path="/admin/system-health" element={<AppLayout><SystemHealth /></AppLayout>} />
            <Route path="/admin/demo" element={<AppLayout><AdminDemo /></AppLayout>} />
            <Route path="/admin/impersonate" element={<AppLayout><AdminImpersonate /></AppLayout>} />
            <Route path="/admin/add-user" element={<AppLayout><AdminAddUser /></AppLayout>} />
            <Route path="/admin/reset-organization" element={<AppLayout><ResetOrganization /></AppLayout>} />
            <Route path="/admin/users" element={<AppLayout><AdminUsers /></AppLayout>} />
            <Route path="/admin/password-diagnostic" element={<AppLayout><AdminPasswordDiagnostic /></AppLayout>} />
            <Route path="/account/set-password" element={<SetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </OnboardingGuard>
          
          {showWizard && userId && (
            <OnboardingWizard userId={userId} onComplete={handleWizardComplete} />
          )}
        </ErrorBoundary>
        </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
