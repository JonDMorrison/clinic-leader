/**
 * Admin UI for Metric Semantics Governance
 * 
 * Allows org admins to manage:
 * - Metric definitions (canonical description, unit, higher_is_better)
 * - Normalization rules (per_provider, per_1000_visits, etc.)
 * - Source policies (allowed sources, priority, audit requirements)
 * - Precedence overrides (org-specific source preferences)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { canAccessAdmin } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Settings2, ArrowUpDown, Database, RefreshCw, ShieldCheck } from "lucide-react";
import { MetricGovernanceDrawer } from "@/components/admin/governance/MetricGovernanceDrawer";
import { RecomputeCanonicalsDialog } from "@/components/admin/governance/RecomputeCanonicalsDialog";
import { AccessRestrictedView } from "@/components/admin/AccessRestrictedView";
import { Skeleton } from "@/components/ui/skeleton";

export default function MetricsGovernance() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: roleData, isLoading: roleLoading } = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [recomputeDialogOpen, setRecomputeDialogOpen] = useState(false);

  const organizationId = currentUser?.team_id;
  const isAdmin = canAccessAdmin(roleData);
  const canEdit = isAdmin;

  // Fetch metrics with governance data
  const { data: metrics, isLoading: metricsLoading, refetch } = useQuery({
    queryKey: ["governance-metrics", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Fetch metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from("metrics")
        .select(`
          id,
          name,
          import_key,
          unit,
          category,
          cadence,
          is_active
        `)
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("category")
        .order("name");

      if (metricsError) throw metricsError;

      // Fetch definitions
      const metricIds = metricsData?.map(m => m.id) || [];
      
      const { data: definitions } = await supabase
        .from("metric_definitions")
        .select("*")
        .in("metric_id", metricIds);

      const { data: sourcePolicies } = await supabase
        .from("metric_source_policies")
        .select("metric_id, source, is_allowed")
        .in("metric_id", metricIds);

      // Build lookup maps
      const defMap = new Map(definitions?.map(d => [d.metric_id, d]) || []);
      const policyCountMap = new Map<string, number>();
      
      sourcePolicies?.forEach(p => {
        if (p.is_allowed) {
          policyCountMap.set(p.metric_id, (policyCountMap.get(p.metric_id) || 0) + 1);
        }
      });

      // Enrich metrics
      return metricsData?.map(metric => ({
        ...metric,
        definition: defMap.get(metric.id) || null,
        allowedSourcesCount: policyCountMap.get(metric.id) || 0,
      })) || [];
    },
    enabled: !!organizationId,
  });

  // Filter metrics by search
  const filteredMetrics = metrics?.filter(m => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(query) ||
      m.import_key?.toLowerCase().includes(query) ||
      m.category?.toLowerCase().includes(query)
    );
  }) || [];

  // Loading state
  if (userLoading || roleLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Access control - show restricted view for non-admins
  if (!isAdmin) {
    return (
      <AccessRestrictedView
        title="Admin Access Required"
        description="Metric Governance settings require organization admin privileges."
        backTo="/scorecard"
        backLabel="Back to Scorecard"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Metric Governance
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage canonical definitions, normalization rules, and source policies
          </p>
        </div>
        <Button onClick={() => setRecomputeDialogOpen(true)}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Recompute Canonicals
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">With Definitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.filter(m => m.definition).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">With Source Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.filter(m => m.allowedSourcesCount > 0).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search metrics by name, key, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Metrics List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Metrics ({filteredMetrics.length})
          </CardTitle>
          <CardDescription>
            Click a metric to configure its governance settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredMetrics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No metrics match your search" : "No metrics found. Add metrics to your scorecard first."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMetrics.map(metric => (
                <div
                  key={metric.id}
                  onClick={() => setSelectedMetricId(metric.id)}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{metric.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {metric.cadence || "weekly"}
                      </Badge>
                      {metric.category && (
                        <Badge variant="secondary" className="text-xs">
                          {metric.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="font-mono text-xs">{metric.import_key || "—"}</span>
                      <span>Unit: {metric.unit || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Definition Status */}
                    {metric.definition ? (
                      <Badge variant="default" className="text-xs">
                        <ArrowUpDown className="w-3 h-3 mr-1" />
                        {metric.definition.higher_is_better ? "↑ Higher" : "↓ Lower"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        No Definition
                      </Badge>
                    )}
                    {/* Sources Count */}
                    <Badge variant={metric.allowedSourcesCount > 0 ? "secondary" : "outline"} className="text-xs">
                      {metric.allowedSourcesCount} source{metric.allowedSourcesCount !== 1 ? "s" : ""}
                    </Badge>
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metric Governance Drawer */}
      <MetricGovernanceDrawer
        metricId={selectedMetricId}
        organizationId={organizationId || null}
        open={!!selectedMetricId}
        onClose={() => setSelectedMetricId(null)}
        onUpdate={() => refetch()}
        canEdit={canEdit}
      />

      {/* Recompute Dialog */}
      <RecomputeCanonicalsDialog
        open={recomputeDialogOpen}
        onClose={() => setRecomputeDialogOpen(false)}
        organizationId={organizationId || null}
      />
    </div>
  );
}
