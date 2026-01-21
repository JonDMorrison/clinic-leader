import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadialGauge, getStatusFromValue } from "@/components/ui/RadialGauge";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  ArrowRight,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface AutomationHealthWidgetProps {
  organizationId: string | undefined;
  compact?: boolean;
}

export const AutomationHealthWidget = ({ organizationId, compact = false }: AutomationHealthWidgetProps) => {
  const navigate = useNavigate();

  // Fetch Jane connector
  const { data: connector, isLoading: connectorLoading } = useQuery({
    queryKey: ["jane-connector-health", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data } = await supabase
        .from("bulk_analytics_connectors")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("source_system", "jane")
        .maybeSingle();
      
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch recent ingests for health calculation
  const { data: recentIngests } = useQuery({
    queryKey: ["ingest-health", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data } = await supabase
        .from("file_ingest_log")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("source_system", "jane_pipe")
        .order("created_at", { ascending: false })
        .limit(10);
      
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch metrics count
  const { data: metricsData } = useQuery({
    queryKey: ["metrics-automation-count", organizationId],
    queryFn: async () => {
      if (!organizationId) return { automated: 0, total: 0 };
      
      const { data } = await supabase
        .from("metrics")
        .select("sync_source")
        .eq("organization_id", organizationId)
        .eq("is_active", true);
      
      const automated = data?.filter(m => m.sync_source === "jane_pipe").length || 0;
      const total = data?.length || 0;
      
      return { automated, total };
    },
    enabled: !!organizationId,
  });

  if (connectorLoading || !connector) {
    return null;
  }

  const lastProcessed = connector.last_processed_at;
  
  // Determine health status - only flag actual errors, not time gaps
  let healthStatus: "healthy" | "error" = "healthy";
  let healthMessage = lastProcessed ? "Pipeline running smoothly" : "Awaiting first data delivery";

  // Only flag actual failures
  const recentFailures = recentIngests?.filter(i => i.status === "error").length || 0;
  if (recentFailures >= 3) {
    healthStatus = "error";
    healthMessage = `${recentFailures} recent failures detected`;
  }

  const automationPercentage = metricsData?.total 
    ? Math.round((metricsData.automated / metricsData.total) * 100) 
    : 0;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-brand/10 to-accent/10 border border-brand/20"
      >
        <div className={`p-2 rounded-lg ${
          healthStatus === "healthy" ? "bg-success/20" : "bg-destructive/20"
        }`}>
          {healthStatus === "healthy" ? (
            <Zap className="w-4 h-4 text-success" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">Data Pipeline</p>
          <p className="text-xs text-muted-foreground truncate">{healthMessage}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/data")}>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="w-5 h-5 text-brand" />
            Pipeline Health
          </span>
          <Badge 
            variant={healthStatus === "healthy" ? "default" : "destructive"}
            className={healthStatus === "healthy" ? "bg-success/20 text-success" : ""}
          >
            {healthStatus === "healthy" ? (
              <><CheckCircle2 className="w-3 h-3 mr-1" /> Healthy</>
            ) : (
              <><AlertTriangle className="w-3 h-3 mr-1" /> Issue</>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Last Data Received</p>
            <p className="font-medium">
              {lastProcessed 
                ? formatDistanceToNow(new Date(lastProcessed), { addSuffix: true })
                : "Awaiting data"
              }
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{healthMessage}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Automation Coverage</span>
          </div>
          <div className="flex items-center justify-center">
            <RadialGauge 
              value={automationPercentage} 
              size={100} 
              strokeWidth={10}
              status={getStatusFromValue(automationPercentage)}
              showLabel={true}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {metricsData?.automated} of {metricsData?.total} metrics automated
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/data")}>
            View Details
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/scorecard")}>
            Open Scorecard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
