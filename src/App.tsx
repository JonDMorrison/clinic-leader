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

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full min-h-screen">
    <Sidebar />
    <main className="flex-1 p-8">
      {children}
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
          <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
