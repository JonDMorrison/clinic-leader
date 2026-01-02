import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Zap,
  Target,
  RefreshCw,
  Calendar,
  BarChart3,
  Loader2,
  FileText,
  Users,
  DollarSign,
  Receipt,
  CalendarClock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { AutomationHealthWidget } from "@/components/dashboard/AutomationHealthWidget";
import { DataInsightsWidget } from "@/components/dashboard/DataInsightsWidget";

// Resource types with icons
const RESOURCE_CONFIG: Record<string, { icon: typeof FileText; label: string }> = {
  appointments: { icon: CalendarClock, label: "Appointments" },
  payments: { icon: DollarSign, label: "Payments" },
  invoices: { icon: Receipt, label: "Invoices" },
  patients: { icon: Users, label: "Patients" },
  shifts: { icon: Calendar, label: "Shifts" },
};

interface ResourceStatus {
  resource: string;
  lastSync: string | null;
  rowCount: number;
  status: 'healthy' | 'stale' | 'waiting' | 'error';
  lastError: string | null;
}

export default function DataHome() {
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

  // Fetch recent ingest logs
  const { data: recentIngests } = useQuery({
    queryKey: ["recent-ingests", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      
      const { data } = await supabase
        .from("file_ingest_log")
        .select("*")
        .eq("organization_id", currentUser.team_id)
        .eq("source_system", "jane")
        .order("created_at", { ascending: false })
        .limit(20);
      
      return data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch per-resource sync status
  const { data: resourceStatuses } = useQuery({
    queryKey: ["resource-statuses", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id || !recentIngests) return [];
      
      const resources = Object.keys(RESOURCE_CONFIG);
      const statuses: ResourceStatus[] = [];
      
      for (const resource of resources) {
        const resourceLogs = recentIngests.filter(log => log.resource_name === resource);
        const latestLog = resourceLogs[0];
        
        let status: 'healthy' | 'stale' | 'waiting' | 'error' = 'waiting';
        
        if (latestLog) {
          if (latestLog.status === 'error') {
            status = 'error';
          } else if (latestLog.status === 'success') {
            const hoursSinceSync = differenceInHours(new Date(), new Date(latestLog.created_at));
            status = hoursSinceSync > 48 ? 'stale' : 'healthy';
          }
        }
        
        const totalRows = resourceLogs
          .filter(log => log.status === 'success')
          .reduce((sum, log) => sum + (log.rows || 0), 0);
        
        statuses.push({
          resource,
          lastSync: latestLog?.created_at || null,
          rowCount: totalRows,
          status,
          lastError: latestLog?.status === 'error' ? latestLog.error : null,
        });
      }
      
      return statuses;
    },
    enabled: !!currentUser?.team_id && !!recentIngests,
  });

  // Fetch automated metrics count
  const { data: automatedMetrics } = useQuery({
    queryKey: ["automated-metrics", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return { automated: 0, manual: 0 };
      
      const { data: metrics } = await supabase
        .from("metrics")
        .select("sync_source")
        .eq("organization_id", currentUser.team_id)
        .eq("is_active", true);
      
      const automated = metrics?.filter(m => m.sync_source === "jane_pipe").length || 0;
      const manual = metrics?.filter(m => m.sync_source === "manual").length || 0;
      
      return { automated, manual };
    },
    enabled: !!currentUser?.team_id,
  });

  const isConnected = janeConnector?.status === "receiving_data" || janeConnector?.status === "awaiting_first_file";
  const hasData = (recentIngests?.length || 0) > 0;
  const lastSync = recentIngests?.[0]?.created_at;

  // Check for stale data (no sync in 48+ hours)
  const hasStaleData = resourceStatuses?.some(r => r.status === 'stale');
  const hasErrors = resourceStatuses?.some(r => r.status === 'error');

  if (janeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand/10 via-background to-accent/10 border border-brand/20 p-8"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-brand/5 via-accent/5 to-brand/5"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-brand/20">
              <Database className="w-8 h-8 text-brand" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Data Automation</h1>
              <p className="text-muted-foreground">Your clinic data, automatically tracked</p>
            </div>
          </div>

          {!isConnected ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-brand" />
                <span>Connect Jane to automate your scorecard</span>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Automatic daily data delivery — no login required</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Appointments, revenue, patients, and more</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Saves 2+ hours/week of manual data entry</span>
                </li>
              </ul>
              <Button 
                size="lg" 
                className="mt-4 gradient-brand"
                onClick={() => navigate("/integrations/jane")}
              >
                Connect Jane
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-background/50 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/20">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold text-success">Connected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-background/50 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand/20">
                      <BarChart3 className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Automated Metrics</p>
                      <p className="font-semibold">{automatedMetrics?.automated || 0} active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-background/50 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20">
                      <RefreshCw className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Sync</p>
                      <p className="font-semibold">
                        {lastSync ? formatDistanceToNow(new Date(lastSync), { addSuffix: true }) : "Awaiting data"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </motion.div>

      {/* Resource Sync Status - Shows when connected */}
      {isConnected && resourceStatuses && resourceStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Data Resources
                </CardTitle>
                <CardDescription>Status of each data type from Jane</CardDescription>
              </div>
              {(hasStaleData || hasErrors) && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {hasErrors ? "Errors detected" : "Stale data"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {resourceStatuses.map((resource) => {
                const config = RESOURCE_CONFIG[resource.resource];
                if (!config) return null;
                
                const Icon = config.icon;
                
                return (
                  <div
                    key={resource.resource}
                    className={`p-4 rounded-lg border ${
                      resource.status === 'healthy' 
                        ? 'bg-success/5 border-success/20'
                        : resource.status === 'stale'
                        ? 'bg-warning/5 border-warning/20'
                        : resource.status === 'error'
                        ? 'bg-destructive/5 border-destructive/20'
                        : 'bg-muted/50 border-dashed'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${
                        resource.status === 'healthy' ? 'text-success' :
                        resource.status === 'stale' ? 'text-warning' :
                        resource.status === 'error' ? 'text-destructive' :
                        'text-muted-foreground'
                      }`} />
                      <span className="font-medium text-sm">{config.label}</span>
                    </div>
                    
                    {resource.status === 'waiting' ? (
                      <p className="text-xs text-muted-foreground">Waiting for first data</p>
                    ) : (
                      <>
                        <p className="text-lg font-semibold">
                          {resource.rowCount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">rows</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {resource.lastSync 
                            ? formatDistanceToNow(new Date(resource.lastSync), { addSuffix: true })
                            : 'No data yet'
                          }
                        </p>
                        {resource.status === 'stale' && (
                          <Badge variant="outline" className="mt-2 text-xs bg-warning/10 text-warning border-warning/30">
                            No update in 48h
                          </Badge>
                        )}
                        {resource.status === 'error' && resource.lastError && (
                          <p className="text-xs text-destructive mt-2 truncate" title={resource.lastError}>
                            {resource.lastError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automation Health Widget - Shows when connected */}
      {isConnected && (
        <AutomationHealthWidget organizationId={currentUser?.team_id} />
      )}

      {/* Data Insights Widget - Shows when connected with data */}
      {isConnected && hasData && (
        <DataInsightsWidget organizationId={currentUser?.team_id} />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-brand/30 transition-colors cursor-pointer" onClick={() => navigate("/scorecard")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand" />
              View Scorecard
            </CardTitle>
            <CardDescription>
              {isConnected 
                ? `${automatedMetrics?.automated || 0} automated, ${automatedMetrics?.manual || 0} manual metrics`
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

      {/* Recent Data Deliveries */}
      {isConnected && recentIngests && recentIngests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Data Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIngests.slice(0, 5).map((ingest) => (
                <div 
                  key={ingest.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {ingest.status === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : ingest.status === "error" ? (
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    ) : (
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{ingest.resource_name || ingest.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ingest.rows} rows • {formatDistanceToNow(new Date(ingest.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={ingest.status === "success" ? "default" : "destructive"}>
                    {ingest.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not connected - show setup steps */}
      {!isConnected && (
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle>Getting Started with Data Automation</CardTitle>
            <CardDescription>
              Follow these steps to start receiving automatic data from Jane
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold">1</div>
                <div className="flex-1">
                  <h4 className="font-semibold">Connect your Jane account</h4>
                  <p className="text-sm text-muted-foreground">
                    Follow the guided setup wizard to configure your data pipeline. No AWS expertise needed.
                  </p>
                  <Button 
                    className="mt-2" 
                    size="sm"
                    onClick={() => navigate("/integrations/jane")}
                  >
                    Start Setup
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 opacity-60">
                <div className="w-8 h-8 rounded-full bg-muted-foreground flex items-center justify-center text-white font-bold">2</div>
                <div className="flex-1">
                  <h4 className="font-semibold">Wait for first data delivery</h4>
                  <p className="text-sm text-muted-foreground">
                    Jane will start sending data within 24 hours. You'll see it automatically populate your scorecard.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 opacity-60">
                <div className="w-8 h-8 rounded-full bg-muted-foreground flex items-center justify-center text-white font-bold">3</div>
                <div className="flex-1">
                  <h4 className="font-semibold">Create issues and rocks from insights</h4>
                  <p className="text-sm text-muted-foreground">
                    Use AI-powered suggestions to turn off-track metrics into actionable priorities.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
