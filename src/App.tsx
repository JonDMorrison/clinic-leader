import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import Home from "./pages/Home";
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

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full min-h-screen relative">
    <Sidebar />
    <main className="flex-1 p-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </main>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<AppLayout><Home /></AppLayout>} />
          <Route path="/scorecard" element={<AppLayout><Scorecard /></AppLayout>} />
          <Route path="/rocks" element={<AppLayout><Rocks /></AppLayout>} />
          <Route path="/issues" element={<AppLayout><Issues /></AppLayout>} />
          <Route path="/l10" element={<AppLayout><L10 /></AppLayout>} />
          <Route path="/docs" element={<AppLayout><Docs /></AppLayout>} />
          <Route path="/people" element={<AppLayout><People /></AppLayout>} />
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
          <Route path="/settings/organization" element={<AppLayout><OrganizationSettings /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
