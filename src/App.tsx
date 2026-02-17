import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserNav } from "@/components/layout/UserNav";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { AppFooter } from "@/components/layout/AppFooter";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import { RoleGuard } from "@/components/RoleGuard";
import { DemoWalkthroughProvider } from "@/components/demo";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDemoProvisioning } from "@/hooks/useDemoProvisioning";
import { FunctionHealthBanner } from "@/components/layout/FunctionHealthBanner";
import { clearLegacyStorage } from "@/lib/storage/versionedStorage";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
const Home = lazy(() => import("./pages/Home"));
const Index = lazy(() => import("./pages/Index"));
const Scorecard = lazy(() => import("./pages/Scorecard"));
const Rocks = lazy(() => import("./pages/Rocks"));
const Issues = lazy(() => import("./pages/Issues"));
const L10 = lazy(() => import("./pages/L10"));
const Meetings = lazy(() => import("./pages/Meetings"));
const MeetingDetail = lazy(() => import("./pages/MeetingDetail"));
const Docs = lazy(() => import("./pages/Docs"));
const People = lazy(() => import("./pages/People"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Imports = lazy(() => import("./pages/Imports"));
const Copilot = lazy(() => import("./pages/Copilot"));
const AILog = lazy(() => import("./pages/AILog"));
const AISettings = lazy(() => import("./pages/AISettings"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportView = lazy(() => import("./pages/ReportView"));
const Branding = lazy(() => import("./pages/Branding"));
const ImportUsers = lazy(() => import("./pages/ImportUsers"));
const ImportMonthlyReport = lazy(() => import("./pages/ImportMonthlyReport"));
const OrganizationSettings = lazy(() => import("./pages/OrganizationSettings"));

const OnboardingAnalytics = lazy(() => import("./pages/OnboardingAnalytics"));
const JaneIntegration = lazy(() => import("./pages/JaneIntegration"));
const Recalls = lazy(() => import("./pages/Recalls"));
const Integrations = lazy(() => import("./pages/Integrations"));
const BulkAnalyticsConnector = lazy(() => import("./pages/BulkAnalyticsConnector"));
const SystemHealth = lazy(() => import("./pages/SystemHealth"));
const AdminDemo = lazy(() => import("./pages/AdminDemo"));
const VTO = lazy(() => import("./pages/VTO"));
const VTOVision = lazy(() => import("./pages/VTOVision"));
const VTOHistory = lazy(() => import("./pages/VTOHistory"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const LibraryDetail = lazy(() => import("./pages/LibraryDetail"));
const AdminImpersonate = lazy(() => import("./pages/AdminImpersonate"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const DocumentUploadAdmin = lazy(() => import("./pages/DocumentUploadAdmin"));
const ScorecardSetup = lazy(() => import("./pages/ScorecardSetup"));
const ScorecardUpdate = lazy(() => import("./pages/ScorecardUpdate"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const ResetOrganization = lazy(() => import("./pages/ResetOrganization"));
const AdminAddUser = lazy(() => import("./pages/AdminAddUser"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminIngestion = lazy(() => import("./pages/AdminIngestion"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const AdminPasswordDiagnostic = lazy(() => import("./pages/AdminPasswordDiagnostic"));
const ImportPdfReport = lazy(() => import("./pages/ImportPdfReport"));
const ScorecardTemplate = lazy(() => import("./pages/ScorecardTemplate"));
const ScorecardOffTrack = lazy(() => import("./pages/ScorecardOffTrack"));
const ScorecardCutover = lazy(() => import("./pages/ScorecardCutover"));
const RocksMonthlyReview = lazy(() => import("./pages/RocksMonthlyReview"));
const QuarterlyCloseReport = lazy(() => import("./pages/QuarterlyCloseReport"));

const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const DataSafety = lazy(() => import("./pages/DataSafety"));
const DataExport = lazy(() => import("./pages/DataExport"));
const DataHomeRouter = lazy(() => import("./pages/DataHomeRouter"));
const JaneCompliance = lazy(() => import("./pages/JaneCompliance"));
const Security = lazy(() => import("./pages/Security"));
const Progress = lazy(() => import("./pages/Progress"));
const Interventions = lazy(() => import("./pages/Interventions"));
const InterventionDetail = lazy(() => import("./pages/InterventionDetail"));
const EMRBenchmark = lazy(() => import("./pages/EMRBenchmark"));
const BenchmarkAdmin = lazy(() => import("./pages/admin/BenchmarkAdmin"));
const JaneVsNonJaneComparison = lazy(() => import("./pages/admin/JaneVsNonJaneComparison"));
const MetricsGovernance = lazy(() => import("./pages/admin/MetricsGovernance"));
const ExecutionDashboard = lazy(() => import("./pages/ExecutionDashboard"));
const Features = lazy(() => import("./pages/Features"));
const IntegrationsPublic = lazy(() => import("./pages/IntegrationsPublic"));
const JaneIntegrationPublic = lazy(() => import("./pages/JaneIntegrationPublic"));
const SpreadsheetIntegration = lazy(() => import("./pages/SpreadsheetIntegration"));
const EMRIntegration = lazy(() => import("./pages/EMRIntegration"));
const About = lazy(() => import("./pages/About"));
const SettingsData = lazy(() => import("./pages/SettingsData"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes default - reduces refetching
      refetchOnWindowFocus: false, // Prevent refetch on tab switch
    },
  },
});

// Clear stale localStorage on app boot
clearLegacyStorage();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex w-full min-h-screen relative bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <div className="lg:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 border-none w-64">
            <Sidebar onItemClick={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 min-w-0 flex flex-col relative">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-4 sticky top-0 z-40 glass border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-muted-foreground"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <span className="font-bold text-brand">ClinicLeader</span>
          </div>
          <UserNav />
        </header>

        {/* Desktop UserNav */}
        <div className="hidden lg:block fixed top-4 right-8 z-50 transition-all">
          <UserNav />
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <FunctionHealthBanner />
          <main className="flex-1 p-4 md:p-8 pt-6 md:pt-20 pb-16 relative overflow-x-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="relative z-10">
              {children}
            </div>
          </main>
        </div>
        <AppFooter />
      </div>
    </div>
  );
};

const App = () => {
  // Auto-provision demo for whitelisted users
  useDemoProvisioning();

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <Suspense fallback={
              <div className="h-screen w-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading ClinicLeader...</p>
                </div>
              </div>
            }>
              <Toaster />
              <Sonner />
              <ImpersonationBanner />
              <ErrorBoundary>
                <DemoWalkthroughProvider>
                  <OnboardingGuard>
                    <Routes>
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/" element={<Index />} />
                      <Route path="/features" element={<Features />} />
                      <Route path="/integrations" element={<IntegrationsPublic />} />
                      <Route path="/integrations/jane" element={<JaneIntegrationPublic />} />
                      <Route path="/integrations/spreadsheets" element={<SpreadsheetIntegration />} />
                      <Route path="/integrations/emr" element={<EMRIntegration />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/security" element={<Security />} />
                      <Route path="/onboarding" element={<AppLayout><Onboarding /></AppLayout>} />
                      <Route path="/dashboard" element={<AppLayout><Home /></AppLayout>} />
                      <Route path="/scorecard/setup" element={<AppLayout><ScorecardSetup /></AppLayout>} />
                      <Route path="/scorecard/update" element={<AppLayout><ScorecardUpdate /></AppLayout>} />
                      <Route path="/scorecard/template" element={<AppLayout><ScorecardTemplate /></AppLayout>} />
                      <Route path="/scorecard/off-track" element={<AppLayout><ScorecardOffTrack /></AppLayout>} />
                      <Route path="/scorecard/cutover" element={<AppLayout><ScorecardCutover /></AppLayout>} />
                      <Route path="/scorecard" element={<AppLayout><Scorecard /></AppLayout>} />
                      <Route path="/rocks" element={<AppLayout><Rocks /></AppLayout>} />
                      <Route path="/issues" element={<AppLayout><Issues /></AppLayout>} />
                      <Route path="/rocks/monthly-review" element={<AppLayout><RocksMonthlyReview /></AppLayout>} />
                      <Route path="/rocks/quarterly-close" element={<AppLayout><QuarterlyCloseReport /></AppLayout>} />

                      <Route path="/progress" element={<AppLayout><Progress /></AppLayout>} />
                      <Route path="/analytics/emr-benchmark" element={<AppLayout><EMRBenchmark /></AppLayout>} />
                      <Route path="/analytics/execution" element={<AppLayout><ExecutionDashboard /></AppLayout>} />
                      <Route path="/interventions" element={<AppLayout><Interventions /></AppLayout>} />
                      <Route path="/interventions/:id" element={<AppLayout><InterventionDetail /></AppLayout>} />
                      <Route path="/data" element={<AppLayout><DataHomeRouter /></AppLayout>} />
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
                      <Route path="/imports/users" element={<AppLayout><ImportUsers /></AppLayout>} />
                      <Route path="/imports/monthly-report" element={<AppLayout><ImportMonthlyReport /></AppLayout>} />
                      <Route path="/imports/pdf-report" element={<AppLayout><RoleGuard requireAdmin><ImportPdfReport /></RoleGuard></AppLayout>} />

                      <Route path="/settings/organization" element={<AppLayout><RoleGuard requireAdmin><OrganizationSettings /></RoleGuard></AppLayout>} />
                      <Route path="/settings/profile" element={<AppLayout><ProfileSettings /></AppLayout>} />
                      <Route path="/settings/team" element={<AppLayout><RoleGuard allowedRoles={['owner', 'director', 'manager']}><TeamManagement /></RoleGuard></AppLayout>} />
                      <Route path="/settings/data" element={<AppLayout><RoleGuard allowedRoles={['owner', 'director', 'manager']}><SettingsData /></RoleGuard></AppLayout>} />
                      <Route path="/settings/integrations" element={<AppLayout><RoleGuard allowedRoles={['owner', 'director', 'manager']}><Integrations /></RoleGuard></AppLayout>} />
                      <Route path="/settings/integrations/jane" element={<AppLayout><RoleGuard allowedRoles={['owner', 'director', 'manager']}><JaneIntegration /></RoleGuard></AppLayout>} />
                      <Route path="/settings/integrations/bulk-analytics" element={<AppLayout><RoleGuard requireAdmin><BulkAnalyticsConnector /></RoleGuard></AppLayout>} />
                      <Route path="/settings/integrations/data-safety" element={<AppLayout><RoleGuard requireAdmin><DataSafety /></RoleGuard></AppLayout>} />
                      <Route path="/integrations/jane/compliance" element={<AppLayout><RoleGuard requireAdmin><JaneCompliance /></RoleGuard></AppLayout>} />
                      <Route path="/admin/onboarding-analytics" element={<AppLayout><RoleGuard requireAdmin><OnboardingAnalytics /></RoleGuard></AppLayout>} />
                      <Route path="/admin" element={<AppLayout><RoleGuard requireAdmin><AdminDashboard /></RoleGuard></AppLayout>} />
                      <Route path="/admin/upload-docs" element={<AppLayout><RoleGuard requireAdmin><DocumentUploadAdmin /></RoleGuard></AppLayout>} />
                      <Route path="/admin/ingestion" element={<AppLayout><RoleGuard requireAdmin><AdminIngestion /></RoleGuard></AppLayout>} />
                      <Route path="/admin/system-health" element={<AppLayout><RoleGuard requireAdmin><SystemHealth /></RoleGuard></AppLayout>} />
                      <Route path="/admin/demo" element={<AppLayout><RoleGuard requireAdmin><AdminDemo /></RoleGuard></AppLayout>} />
                      <Route path="/admin/impersonate" element={<AppLayout><RoleGuard requireAdmin><AdminImpersonate /></RoleGuard></AppLayout>} />
                      <Route path="/admin/add-user" element={<AppLayout><RoleGuard requireAdmin><AdminAddUser /></RoleGuard></AppLayout>} />
                      <Route path="/admin/reset-organization" element={<AppLayout><RoleGuard requireAdmin><ResetOrganization /></RoleGuard></AppLayout>} />
                      <Route path="/admin/users" element={<AppLayout><RoleGuard requireAdmin><AdminUsers /></RoleGuard></AppLayout>} />
                      <Route path="/admin/password-diagnostic" element={<AppLayout><RoleGuard requireAdmin><AdminPasswordDiagnostic /></RoleGuard></AppLayout>} />
                      <Route path="/admin/benchmarks" element={<AppLayout><RoleGuard requireAdmin><BenchmarkAdmin /></RoleGuard></AppLayout>} />
                      <Route path="/admin/benchmarks/jane-vs-nonjane" element={<AppLayout><RoleGuard requireAdmin><JaneVsNonJaneComparison /></RoleGuard></AppLayout>} />
                      <Route path="/admin/metrics-governance" element={<AppLayout><RoleGuard requireAdmin><MetricsGovernance /></RoleGuard></AppLayout>} />
                      <Route path="/export" element={<DataExport />} />
                      <Route path="/account/set-password" element={<SetPassword />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </OnboardingGuard>
                </DemoWalkthroughProvider>
              </ErrorBoundary>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
