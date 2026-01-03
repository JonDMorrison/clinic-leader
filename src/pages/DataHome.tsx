import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  CalendarClock,
  UserCog,
  MapPin,
  Stethoscope,
  Package,
  ClipboardList,
  Building2,
  ChevronDown,
  EyeOff
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { AutomationHealthWidget } from "@/components/dashboard/AutomationHealthWidget";
import { DataInsightsWidget } from "@/components/dashboard/DataInsightsWidget";
import { ResourceCard, type JaneResource, type ResourceStatus } from "@/components/data/ResourceCard";
import { AddJaneMetricModal } from "@/components/data/AddJaneMetricModal";
import { useHiddenJaneResources } from "@/hooks/useHiddenJaneResources";

// Full Jane data resources with descriptions

const JANE_RESOURCES: Record<string, JaneResource> = {
  appointments: { 
    icon: CalendarClock, 
    label: "Appointments",
    description: "Booking status, duration, practitioner assignment, location. No clinical notes.",
    available: true,
    metrics: ["Total Visits", "New Patient Visits", "Show Rate %", "Cancellation Rate %", "No Shows"]
  },
  payments: { 
    icon: DollarSign, 
    label: "Payments",
    description: "Amount, date, payment method category, payer type. No card numbers.",
    available: true,
    metrics: ["Total Collected Revenue", "Average Revenue Per Visit"]
  },
  invoices: { 
    icon: Receipt, 
    label: "Invoices",
    description: "Totals, income category, staff assignment. No line-item descriptions.",
    available: true,
    metrics: ["Total Invoiced", "Revenue by Provider"]
  },
  patients: { 
    icon: Users, 
    label: "Patients",
    description: "Anonymized demographics. City, province, postal prefix, referral source. No names or contact info.",
    available: true,
    metrics: ["New Patients", "Patient Retention", "Referral Sources"]
  },
  shifts: { 
    icon: Calendar, 
    label: "Shifts",
    description: "Scheduled hours, practitioner assignment, location. Used for utilization metrics.",
    available: true,
    metrics: ["Practitioner Utilization", "Available Hours"]
  },
  staff_members: {
    icon: UserCog,
    label: "Staff Members",
    description: "Practitioner profiles, disciplines, and active status. Used for provider-level breakdowns.",
    available: true,
    metrics: ["Provider Scorecards", "Team Performance"]
  },
  locations: {
    icon: MapPin,
    label: "Locations",
    description: "Clinic locations and room configurations. Used for location-based reporting.",
    available: true,
    metrics: ["Revenue by Location", "Utilization by Room"]
  },
  treatments: {
    icon: Stethoscope,
    label: "Treatments",
    description: "Service types, pricing, and duration. No clinical protocols.",
    available: true,
    metrics: ["Service Mix", "Revenue by Treatment Type"]
  },
  products: {
    icon: Package,
    label: "Products",
    description: "Retail inventory and sales. Product names and pricing only.",
    available: false,
    metrics: ["Product Sales", "Inventory Turnover"]
  },
  waitlist: {
    icon: ClipboardList,
    label: "Waitlist",
    description: "Waitlist entries and conversion rates. No patient identifiers.",
    available: false,
    metrics: ["Waitlist Conversion", "Average Wait Time"]
  },
  disciplines: {
    icon: Building2,
    label: "Disciplines",
    description: "Practice areas and specialties. Used for service categorization.",
    available: true,
    metrics: ["Revenue by Discipline"]
  },
};

// Active resource types (currently supported in data pipeline)
const RESOURCE_CONFIG: Record<string, { icon: typeof FileText; label: string }> = {
  appointments: { icon: CalendarClock, label: "Appointments" },
  payments: { icon: DollarSign, label: "Payments" },
  invoices: { icon: Receipt, label: "Invoices" },
  patients: { icon: Users, label: "Patients" },
  shifts: { icon: Calendar, label: "Shifts" },
};

export default function DataHome() {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  
  // Hidden resources management
  const { hiddenResources, hideResource, unhideResource } = useHiddenJaneResources();
  const [showHidden, setShowHidden] = useState(false);
  
  // Add metric modal state
  const [addMetricModal, setAddMetricModal] = useState<{
    open: boolean;
    resourceKey: string;
    metricName: string;
  }>({ open: false, resourceKey: "", metricName: "" });

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

  const isConnected = janeConnector?.status === "receiving_data" || janeConnector?.status === "awaiting_first_file" || janeConnector?.status === "active" || janeConnector?.status === "awaiting_jane_setup";
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


      {/* Available Jane Resources - Interactive section */}
      {isConnected && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Available Jane Resources
                  </CardTitle>
                  <CardDescription>
                    Click any metric to add it to your scorecard
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {hiddenResources.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHidden(!showHidden)}
                      className="text-muted-foreground"
                    >
                      <EyeOff className="w-4 h-4 mr-1" />
                      {hiddenResources.length} hidden
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showHidden ? 'rotate-180' : ''}`} />
                    </Button>
                  )}
                  <Badge variant="secondary">
                    {Object.values(JANE_RESOURCES).filter(r => r.available && !hiddenResources.includes(Object.keys(JANE_RESOURCES).find(k => JANE_RESOURCES[k] === r) || '')).length} Active
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Visible Resources */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {Object.entries(JANE_RESOURCES)
                    .filter(([key]) => !hiddenResources.includes(key))
                    .map(([key, resource]) => {
                      const isActive = Object.keys(RESOURCE_CONFIG).includes(key);
                      const status = resourceStatuses?.find(s => s.resource === key);
                      
                      return (
                        <ResourceCard
                          key={key}
                          resourceKey={key}
                          resource={resource}
                          isActive={isActive}
                          isHidden={false}
                          status={status}
                          onHide={hideResource}
                          onUnhide={unhideResource}
                          onAddMetric={(rk, metric) => setAddMetricModal({ open: true, resourceKey: rk, metricName: metric })}
                        />
                      );
                    })}
                </AnimatePresence>
              </div>

              {/* Hidden Resources Section */}
              {hiddenResources.length > 0 && (
                <Collapsible open={showHidden} onOpenChange={setShowHidden}>
                  <CollapsibleContent>
                    <div className="pt-4 border-t border-dashed">
                      <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <EyeOff className="w-4 h-4" />
                        Hidden Resources
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence mode="popLayout">
                          {Object.entries(JANE_RESOURCES)
                            .filter(([key]) => hiddenResources.includes(key))
                            .map(([key, resource]) => {
                              const isActive = Object.keys(RESOURCE_CONFIG).includes(key);
                              const status = resourceStatuses?.find(s => s.resource === key);
                              
                              return (
                                <ResourceCard
                                  key={key}
                                  resourceKey={key}
                                  resource={resource}
                                  isActive={isActive}
                                  isHidden={true}
                                  status={status}
                                  onHide={hideResource}
                                  onUnhide={unhideResource}
                                  onAddMetric={(rk, metric) => setAddMetricModal({ open: true, resourceKey: rk, metricName: metric })}
                                />
                              );
                            })}
                        </AnimatePresence>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>

          {/* Add Metric Modal */}
          <AddJaneMetricModal
            open={addMetricModal.open}
            onOpenChange={(open) => setAddMetricModal(prev => ({ ...prev, open }))}
            resourceKey={addMetricModal.resourceKey}
            metricName={addMetricModal.metricName}
          />
        </>
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
