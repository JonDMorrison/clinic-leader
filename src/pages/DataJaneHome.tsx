import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Target,
  RefreshCw,
  BarChart3,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { DataMetricsTable } from "@/components/data/DataMetricsTable";
import { IntegrationsBanner } from "@/components/data/IntegrationsBanner";
import { DataSourceStatusLine } from "@/components/data/DataSourcePill";

export default function DataJaneHome() {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  // Fetch Jane connector status
  const { data: janeConnector, isLoading: janeLoading } = useQuery({
    queryKey: ["jane-connector", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      
      const { data } = await supabase
        .from("bulk_analytics_connectors")
        .select("*")
        .eq("organization_id", currentUser.team_id)
        .eq("source_system", "jane")
        .maybeSingle();
      
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch recent ingest logs for last sync time
  const { data: recentIngests } = useQuery({
    queryKey: ["recent-ingests", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      
      const { data } = await supabase
        .from("file_ingest_log")
        .select("created_at, status")
        .eq("organization_id", currentUser.team_id)
        .eq("source_system", "jane")
        .order("created_at", { ascending: false })
        .limit(1);
      
      return data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch automated metrics count
  const { data: metricsCount } = useQuery({
    queryKey: ["metrics-count", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return { total: 0, automated: 0 };
      
      const { data: metrics } = await supabase
        .from("metrics")
        .select("sync_source")
        .eq("organization_id", currentUser.team_id)
        .eq("is_active", true);
      
      const total = metrics?.length || 0;
      const automated = metrics?.filter(m => m.sync_source === "jane_pipe").length || 0;
      
      return { total, automated };
    },
    enabled: !!currentUser?.team_id,
  });

  const isConnected = janeConnector?.status === "receiving_data" || 
    janeConnector?.status === "awaiting_first_file" || 
    janeConnector?.status === "active" || 
    janeConnector?.status === "awaiting_jane_setup";
  
  const lastSync = recentIngests?.[0]?.created_at;

  if (janeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-brand/10">
              <Database className="w-8 h-8 text-brand" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Data</h1>
              <p className="text-muted-foreground">View and track your clinic metrics</p>
            </div>
          </div>

        {/* Connection status badges */}
        <div className="flex items-center gap-3">
          {isConnected && (
            <>
              <Badge variant="outline" className="gap-1.5 py-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                Jane Connected
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                {lastSync 
                  ? formatDistanceToNow(new Date(lastSync), { addSuffix: true })
                  : "Awaiting data"
                }
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                {metricsCount?.total || 0} tracked
              </Badge>
            </>
          )}
        </div>
        </div>
        {/* Data Source Status Line */}
        <DataSourceStatusLine className="ml-14" />
      </motion.div>

      {/* Main Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Available Metrics
          </CardTitle>
          <CardDescription>
            All available data points from your connected integrations and templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataMetricsTable isConnected={isConnected} />
        </CardContent>
      </Card>

      {/* Integrations Banner */}
      <IntegrationsBanner isConnected={isConnected} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-brand/30 transition-colors cursor-pointer" onClick={() => navigate("/scorecard")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand" />
              View Scorecard
            </CardTitle>
            <CardDescription>
              {metricsCount?.total 
                ? `${metricsCount.automated} automated, ${metricsCount.total - metricsCount.automated} manual metrics`
                : "Set up your key performance indicators"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Open Scorecard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-brand/30 transition-colors cursor-pointer" onClick={() => navigate("/issues")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Create Issues
            </CardTitle>
            <CardDescription>
              Convert off-track metrics into actionable issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View Issues
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-brand/30 transition-colors cursor-pointer" onClick={() => navigate("/rocks")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-success" />
              Build Rocks
            </CardTitle>
            <CardDescription>
              Generate 90-day priorities from your data trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View Rocks
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
