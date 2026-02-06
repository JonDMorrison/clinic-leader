/**
 * InterventionGovernanceHealthPanel
 * 
 * Master admin panel showing intervention type governance health metrics.
 * Tracks type coverage, AI acceptance rates, and success by type.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Activity,
  Bot,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  BarChart3,
  Tag,
} from "lucide-react";
import { useMasterAdmin } from "@/hooks/useMasterAdmin";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

type DateRange = "30d" | "90d" | "all";

interface TypeCoverageStats {
  totalInterventions: number;
  typedInterventions: number;
  untypedCount: number;
  coverageRate: number;
}

interface AcceptanceStats {
  aiAccepted: number;
  userOverrides: number;
  totalDecisions: number;
  acceptanceRate: number;
}

interface TypeSuccessStats {
  typeId: string;
  typeName: string;
  sampleSize: number;
  successRate: number;
  avgDeltaPercent: number;
}

export function InterventionGovernanceHealthPanel() {
  const { data: isMasterAdmin, isLoading: isAdminLoading } = useMasterAdmin();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const dateFilter = getDateFilter(dateRange);

  // Query: Type Coverage
  const { data: coverage, isLoading: coverageLoading } = useQuery({
    queryKey: ["governance-coverage", dateRange],
    queryFn: () => fetchTypeCoverage(dateFilter),
    enabled: !!isMasterAdmin,
    staleTime: 60_000,
  });

  // Query: AI Acceptance Rate
  const { data: acceptance, isLoading: acceptanceLoading } = useQuery({
    queryKey: ["governance-acceptance", dateRange],
    queryFn: () => fetchAcceptanceRate(dateFilter),
    enabled: !!isMasterAdmin,
    staleTime: 60_000,
  });

  // Query: Success by Type
  const { data: typeSuccess, isLoading: successLoading } = useQuery({
    queryKey: ["governance-type-success", dateRange, showActiveOnly],
    queryFn: () => fetchTypeSuccessStats(dateFilter, showActiveOnly),
    enabled: !!isMasterAdmin,
    staleTime: 60_000,
  });

  // Access guard
  if (isAdminLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking access...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isMasterAdmin) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Master admin access is required to view governance health metrics.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isLoading = coverageLoading || acceptanceLoading || successLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Governance Health
        </CardTitle>
        <CardDescription>
          Intervention type coverage, AI adoption, and outcome analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <TabsList>
              <TabsTrigger value="30d">Last 30 days</TabsTrigger>
              <TabsTrigger value="90d">Last 90 days</TabsTrigger>
              <TabsTrigger value="all">All time</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Switch
              id="active-only"
              checked={showActiveOnly}
              onCheckedChange={setShowActiveOnly}
            />
            <Label htmlFor="active-only" className="text-sm">Active types only</Label>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Type Coverage */}
          <MetricCard
            title="Type Coverage"
            icon={<Tag className="h-4 w-4" />}
            loading={coverageLoading}
          >
            {coverage && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">
                    {coverage.coverageRate.toFixed(1)}%
                  </span>
                  <Badge variant={coverage.coverageRate >= 80 ? "default" : "secondary"}>
                    {coverage.typedInterventions} / {coverage.totalInterventions}
                  </Badge>
                </div>
                <Progress value={coverage.coverageRate} className="h-2" />
                {coverage.untypedCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    {coverage.untypedCount} untyped interventions
                  </div>
                )}
              </div>
            )}
          </MetricCard>

          {/* AI Acceptance Rate */}
          <MetricCard
            title="AI Suggestion Acceptance"
            icon={<Bot className="h-4 w-4" />}
            loading={acceptanceLoading}
          >
            {acceptance && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">
                    {acceptance.acceptanceRate.toFixed(1)}%
                  </span>
                  <Badge variant="outline">
                    {acceptance.aiAccepted} accepted
                  </Badge>
                </div>
                <Progress 
                  value={acceptance.acceptanceRate} 
                  variant={acceptance.acceptanceRate >= 70 ? "success" : "warning"}
                  className="h-2" 
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{acceptance.userOverrides} user overrides</span>
                  <span>{acceptance.totalDecisions} total decisions</span>
                </div>
              </div>
            )}
          </MetricCard>

          {/* Summary Card */}
          <MetricCard
            title="Outcome Summary"
            icon={<BarChart3 className="h-4 w-4" />}
            loading={successLoading}
          >
            {typeSuccess && typeSuccess.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">
                    {typeSuccess.length}
                  </span>
                  <span className="text-sm text-muted-foreground">types with outcomes</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Avg success rate: </span>
                  <span className={getSuccessColor(
                    typeSuccess.reduce((sum, t) => sum + t.successRate, 0) / typeSuccess.length
                  )}>
                    {(typeSuccess.reduce((sum, t) => sum + t.successRate, 0) / typeSuccess.length).toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Total samples: </span>
                  <span>{typeSuccess.reduce((sum, t) => sum + t.sampleSize, 0)}</span>
                </div>
              </div>
            )}
            {typeSuccess && typeSuccess.length === 0 && (
              <p className="text-sm text-muted-foreground">No outcome data available</p>
            )}
          </MetricCard>
        </div>

        <Separator />

        {/* Success by Type Table */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Outcome Success by Type (Top 5)
          </h4>
          
          {successLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : typeSuccess && typeSuccess.length > 0 ? (
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-right p-3 font-medium">Samples</th>
                    <th className="text-right p-3 font-medium">Success Rate</th>
                    <th className="text-right p-3 font-medium">Avg Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {typeSuccess.slice(0, 5).map((row) => (
                    <tr key={row.typeId} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{row.typeName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {row.sampleSize}
                      </td>
                      <td className="p-3 text-right">
                        <span className={getSuccessColor(row.successRate)}>
                          {row.successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {row.avgDeltaPercent >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-primary" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                          )}
                          <span className={row.avgDeltaPercent >= 0 ? "text-primary" : "text-destructive"}>
                            {row.avgDeltaPercent >= 0 ? "+" : ""}{row.avgDeltaPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              No outcome data available for the selected period.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ 
  title, 
  icon, 
  loading, 
  children 
}: { 
  title: string; 
  icon: React.ReactNode; 
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function getDateFilter(range: DateRange): Date | null {
  switch (range) {
    case "30d":
      return subDays(new Date(), 30);
    case "90d":
      return subDays(new Date(), 90);
    case "all":
      return null;
  }
}

function getSuccessColor(rate: number): string {
  if (rate >= 70) return "text-primary font-medium";
  if (rate >= 50) return "text-warning font-medium";
  return "text-destructive font-medium";
}

async function fetchTypeCoverage(dateFilter: Date | null): Promise<TypeCoverageStats> {
  let query = supabase
    .from("interventions")
    .select("id, intervention_type_id", { count: "exact" });

  if (dateFilter) {
    query = query.gte("created_at", dateFilter.toISOString());
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching coverage:", error);
    throw error;
  }

  const totalInterventions = count || 0;
  const typedInterventions = data?.filter((i) => i.intervention_type_id).length || 0;
  const untypedCount = totalInterventions - typedInterventions;
  const coverageRate = totalInterventions > 0 
    ? (typedInterventions / totalInterventions) * 100 
    : 0;

  return { totalInterventions, typedInterventions, untypedCount, coverageRate };
}

async function fetchAcceptanceRate(dateFilter: Date | null): Promise<AcceptanceStats> {
  let query = supabase
    .from("interventions")
    .select("id, intervention_type_source")
    .in("intervention_type_source", ["ai", "user"]);

  if (dateFilter) {
    query = query.gte("created_at", dateFilter.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching acceptance:", error);
    throw error;
  }

  const aiAccepted = data?.filter((i) => i.intervention_type_source === "ai").length || 0;
  const userOverrides = data?.filter((i) => i.intervention_type_source === "user").length || 0;
  const totalDecisions = aiAccepted + userOverrides;
  const acceptanceRate = totalDecisions > 0 
    ? (aiAccepted / totalDecisions) * 100 
    : 0;

  return { aiAccepted, userOverrides, totalDecisions, acceptanceRate };
}

async function fetchTypeSuccessStats(
  dateFilter: Date | null,
  activeOnly: boolean
): Promise<TypeSuccessStats[]> {
  // Get intervention types
  let typesQuery = supabase
    .from("intervention_types")
    .select("id, display_name");
  
  if (activeOnly) {
    typesQuery = typesQuery.eq("is_enabled", true);
  }

  const { data: types, error: typesError } = await typesQuery;

  if (typesError || !types) {
    console.error("Error fetching types:", typesError);
    return [];
  }

  // Get outcomes with intervention type data
  // We need to join through interventions to get the type
  let outcomesQuery = supabase
    .from("intervention_outcomes")
    .select(`
      id,
      actual_delta_percent,
      confidence_score,
      intervention_id
    `);

  if (dateFilter) {
    outcomesQuery = outcomesQuery.gte("evaluated_at", dateFilter.toISOString());
  }

  const { data: outcomes, error: outcomesError } = await outcomesQuery;

  if (outcomesError) {
    console.error("Error fetching outcomes:", outcomesError);
    return [];
  }

  // Get interventions for type mapping
  const interventionIds = [...new Set((outcomes || []).map(o => o.intervention_id))];
  
  if (interventionIds.length === 0) {
    return [];
  }

  const { data: interventions, error: interventionsError } = await supabase
    .from("interventions")
    .select("id, intervention_type_id, status")
    .in("id", interventionIds);

  if (interventionsError) {
    console.error("Error fetching interventions:", interventionsError);
    return [];
  }

  const interventionMap = new Map(
    (interventions || []).map(i => [i.id, { typeId: i.intervention_type_id, status: i.status }])
  );

  // Aggregate by type
  const typeMap = new Map<string, { samples: number; successes: number; deltas: number[] }>();

  for (const outcome of outcomes || []) {
    const intervention = interventionMap.get(outcome.intervention_id);
    const typeId = intervention?.typeId;
    if (!typeId) continue;

    if (!typeMap.has(typeId)) {
      typeMap.set(typeId, { samples: 0, successes: 0, deltas: [] });
    }

    const entry = typeMap.get(typeId)!;
    entry.samples++;
    
    // Count as successful if delta >= 2% (matches outcomeClassification logic)
    const delta = outcome.actual_delta_percent;
    if (delta != null && delta >= 2) {
      entry.successes++;
    }
    if (delta != null) {
      entry.deltas.push(delta);
    }
  }

  // Build stats array
  const stats: TypeSuccessStats[] = [];
  
  for (const type of types) {
    const entry = typeMap.get(type.id);
    if (!entry || entry.samples === 0) continue;

    stats.push({
      typeId: type.id,
      typeName: type.display_name,
      sampleSize: entry.samples,
      successRate: (entry.successes / entry.samples) * 100,
      avgDeltaPercent: entry.deltas.length > 0
        ? entry.deltas.reduce((a, b) => a + b, 0) / entry.deltas.length
        : 0,
    });
  }

  // Sort by sample size descending
  stats.sort((a, b) => b.sampleSize - a.sampleSize);

  return stats;
}
