import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useActiveConnectors } from "@/hooks/useActiveConnectors";
import { Loader2, Database } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import DataJaneHome from "./DataJaneHome";
import DataDefaultHome from "./DataDefaultHome";

export default function DataHomeRouter() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { hasActiveConnector, isLoading: connectorsLoading } = useActiveConnectors();

  // Check if org has legacy monthly reports
  const { data: hasLegacyReports, isLoading: legacyLoading } = useQuery({
    queryKey: ["has-legacy-reports", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return false;
      const { data, error } = await supabase
        .from("legacy_monthly_reports" as any)
        .select("id")
        .eq("organization_id", currentUser.team_id)
        .limit(1);
      if (error) return false;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!currentUser?.team_id,
    staleTime: 60 * 1000,
  });

  const isLoading = userLoading || connectorsLoading || legacyLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  const hasJane = hasActiveConnector("jane");
  const hasLegacy = !!hasLegacyReports;

  // Both sources: show tabbed view
  if (hasJane && hasLegacy) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        {/* Shared header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-3 rounded-xl bg-brand/10">
            <Database className="w-8 h-8 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Data</h1>
            <p className="text-muted-foreground">View and track your clinic metrics</p>
          </div>
        </motion.div>

        <Tabs defaultValue="reports">
          <TabsList>
            <TabsTrigger value="reports">Monthly Reports</TabsTrigger>
            <TabsTrigger value="metrics">Jane Metrics</TabsTrigger>
          </TabsList>
          <TabsContent value="reports">
            <DataDefaultHome embedded />
          </TabsContent>
          <TabsContent value="metrics">
            <DataJaneHome embedded />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Jane only
  if (hasJane) {
    return <DataJaneHome />;
  }

  // Default / legacy only
  return <DataDefaultHome />;
}
