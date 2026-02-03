/**
 * Jane vs Non-Jane Comparison Page
 * 
 * SECURITY: Master admin only - shows cross-org EMR cohort comparisons.
 * All data access goes through secure RPCs with audit logging.
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMasterAdminGate } from "@/hooks/useMasterAdminGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, BarChart3, Shield } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { AccessRestrictedView } from "@/components/admin/AccessRestrictedView";
import { QualityGateWarningBanner } from "@/components/analytics/QualityGateWarningBanner";
import { BenchmarkQualitySummary } from "@/components/analytics/BenchmarkQualitySummary";
import { InterpretationCallout } from "@/components/analytics/InterpretationCallout";
import { PeerMatchingToggle } from "@/components/analytics/PeerMatchingToggle";
import { ConfidenceBadge } from "@/components/analytics/ConfidenceBadge";
import type { ConfidenceLabel } from "@/lib/analytics/emrComparisonTypes";

interface Cohort {
  id: string;
  name: string;
  member_count: number;
}

interface Metric {
  id: string;
  name: string;
}

interface Snapshot {
  id: string;
  cohort_id: string;
  metric_id: string;
  metric_name?: string;
  period_type: string;
  period_start: string;
  n_orgs: number | null;
  included_count?: number;
  excluded_count?: number;
  excluded_low_completeness?: number;
  excluded_high_latency?: number;
  excluded_low_consistency?: number;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  mean: number | null;
  stddev: number | null;
  computed_at: string;
  quality_summary?: {
    avg_completeness: number | null;
    avg_consistency: number | null;
    avg_latency_days: number | null;
  };
  suppressed?: boolean;
  high_exclusion_warning?: boolean;
}

interface ComparisonData {
  jane: Snapshot | null;
  nonJane: Snapshot | null;
  delta: {
    p25: number | null;
    p50: number | null;
    p75: number | null;
    mean: number | null;
  };
}

interface MatchedComparisonResult {
  metric_key: string;
  period_key: string;
  peer_matching_used: boolean;
  peer_match_criteria: string | null;
  jane_sample_size: number | null;
  jane_included_count: number;
  jane_excluded_count: number;
  jane_median: number | null;
  jane_p25: number | null;
  jane_p75: number | null;
  jane_std_deviation: number | null;
  jane_coefficient_of_variation: number | null;
  jane_quality_summary: object | null;
  non_jane_sample_size: number | null;
  non_jane_included_count: number;
  non_jane_excluded_count: number;
  non_jane_median: number | null;
  non_jane_p25: number | null;
  non_jane_p75: number | null;
  non_jane_std_deviation: number | null;
  non_jane_coefficient_of_variation: number | null;
  non_jane_quality_summary: object | null;
  delta_percent: number | null;
  confidence_label: ConfidenceLabel;
  confidence_reason: string | null;
  suppressed: boolean;
  suppression_reason: string | null;
}

export default function JaneVsNonJaneComparison() {
  const { isMasterAdmin, isLoading: adminLoading } = useMasterAdminGate();
  const [selectedMetricId, setSelectedMetricId] = useState<string>("");
  const [usePeerMatching, setUsePeerMatching] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const lastMonth = startOfMonth(subMonths(new Date(), 1));
    return format(lastMonth, "yyyy-MM-dd");
  });

  // Get cohorts to find jane_users and non_jane_users
  const { data: cohorts } = useQuery({
    queryKey: ["benchmark-cohorts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("bench_get_cohorts");
      if (error) throw error;
      return data as Cohort[];
    },
    enabled: !!isMasterAdmin,
  });

  const janeCohort = cohorts?.find((c) => c.name === "jane_users");
  const nonJaneCohort = cohorts?.find((c) => c.name === "non_jane_users");

  // Get metrics
  const { data: metrics } = useQuery({
    queryKey: ["all-metrics-for-benchmark"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Metric[];
    },
    enabled: !!isMasterAdmin,
  });

  // Generate last 6 months
  const last6Months = useMemo(() => {
    const months = [];
    for (let i = 1; i <= 6; i++) {
      const date = startOfMonth(subMonths(new Date(), i));
      months.push({
        value: format(date, "yyyy-MM-dd"),
        label: format(date, "MMMM yyyy"),
      });
    }
    return months;
  }, []);

  // Fetch snapshots for Jane cohort (6 months) - use secure RPC
  const { data: janeSnapshots, isLoading: janeLoading } = useQuery({
    queryKey: ["jane-snapshots-trend", janeCohort?.id, selectedMetricId],
    queryFn: async () => {
      if (!janeCohort?.id || !selectedMetricId) return [];
      const { data, error } = await (supabase.rpc as any)("bench_list_snapshots", {
        _cohort_id: janeCohort.id,
        _metric_id: selectedMetricId,
        _limit: 12,
      });
      if (error) throw error;
      return ((data || []) as any[]).filter((s: any) => s.period_type === "monthly") as Snapshot[];
    },
    enabled: !!janeCohort?.id && !!selectedMetricId && !!isMasterAdmin,
  });

  // Fetch snapshots for Non-Jane cohort (6 months) - use secure RPC
  const { data: nonJaneSnapshots, isLoading: nonJaneLoading } = useQuery({
    queryKey: ["non-jane-snapshots-trend", nonJaneCohort?.id, selectedMetricId],
    queryFn: async () => {
      if (!nonJaneCohort?.id || !selectedMetricId) return [];
      const { data, error } = await (supabase.rpc as any)("bench_list_snapshots", {
        _cohort_id: nonJaneCohort.id,
        _metric_id: selectedMetricId,
        _limit: 12,
      });
      if (error) throw error;
      return ((data || []) as any[]).filter((s: any) => s.period_type === "monthly") as Snapshot[];
    },
    enabled: !!nonJaneCohort?.id && !!selectedMetricId && !!isMasterAdmin,
  });

  // Get selected metric's import_key for the matched comparison RPC
  const selectedMetric = metrics?.find((m) => m.id === selectedMetricId);

  // Fetch matched comparison using the new peer matching RPC
  const { data: matchedComparison, isLoading: matchedLoading } = useQuery({
    queryKey: ["matched-comparison", selectedMetric?.name, selectedMonth, usePeerMatching],
    queryFn: async () => {
      if (!selectedMetric?.name) return null;
      const periodKey = format(new Date(selectedMonth), "yyyy-MM");
      const { data, error } = await supabase.rpc("bench_get_matched_comparison", {
        _metric_key: selectedMetric.name.toLowerCase().replace(/\s+/g, "_"),
        _period_key: periodKey,
        _use_peer_matching: usePeerMatching,
      });
      if (error) throw error;
      return (data as MatchedComparisonResult[])?.[0] || null;
    },
    enabled: !!selectedMetric?.name && !!selectedMonth && !!isMasterAdmin,
  });

  // Build comparison data for selected month
  const selectedComparison: ComparisonData = useMemo(() => {
    const jane = janeSnapshots?.find((s) => s.period_start === selectedMonth) || null;
    const nonJane = nonJaneSnapshots?.find((s) => s.period_start === selectedMonth) || null;

    const calcDelta = (jVal: number | null, nVal: number | null) => {
      if (jVal === null || nVal === null) return null;
      return jVal - nVal;
    };

    return {
      jane,
      nonJane,
      delta: {
        p25: calcDelta(jane?.p25 ?? null, nonJane?.p25 ?? null),
        p50: calcDelta(jane?.p50 ?? null, nonJane?.p50 ?? null),
        p75: calcDelta(jane?.p75 ?? null, nonJane?.p75 ?? null),
        mean: calcDelta(jane?.mean ?? null, nonJane?.mean ?? null),
      },
    };
  }, [janeSnapshots, nonJaneSnapshots, selectedMonth]);

  // Build 6-month trend data
  const trendData = useMemo(() => {
    return last6Months.map((month) => {
      const jane = janeSnapshots?.find((s) => s.period_start === month.value);
      const nonJane = nonJaneSnapshots?.find((s) => s.period_start === month.value);
      const delta = jane?.p50 != null && nonJane?.p50 != null ? jane.p50 - nonJane.p50 : null;

      return {
        month: month.label,
        periodStart: month.value,
        janeP50: jane?.p50 ?? null,
        nonJaneP50: nonJane?.p50 ?? null,
        delta,
        janeN: jane?.n_orgs ?? 0,
        nonJaneN: nonJane?.n_orgs ?? 0,
      };
    }).reverse();
  }, [janeSnapshots, nonJaneSnapshots, last6Months]);

  const formatNumber = (value: number | null) => {
    if (value === null) return "—";
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const DeltaIndicator = ({ value }: { value: number | null }) => {
    if (value === null) return <span className="text-muted-foreground">—</span>;
    const isPositive = value > 0;
    const isZero = Math.abs(value) < 0.01;

    if (isZero) {
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-4 w-4" />
          0
        </span>
      );
    }

    return (
      <span className={`flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {isPositive ? "+" : ""}{formatNumber(value)}
      </span>
    );
  };

  if (adminLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isMasterAdmin) {
    return (
      <AccessRestrictedView
        title="Master Admin Required"
        description="Cross-organization EMR comparisons require platform administrator privileges."
        backTo="/admin/benchmarks"
      />
    );
  }

  const cohortsExist = janeCohort && nonJaneCohort;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/benchmarks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Jane vs Non-Jane Comparison</h1>
            <p className="text-muted-foreground">
              Partner-safe aggregated benchmark comparison
            </p>
          </div>
        </div>
      </div>

      {/* Warning if cohorts don't exist */}
      {!cohortsExist && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <p className="text-amber-800 dark:text-amber-200">
              Default cohorts not found. Please go to{" "}
              <Link to="/admin/benchmarks" className="underline font-medium">
                Benchmark Admin
              </Link>{" "}
              and click "Refresh Default Cohorts" first.
            </p>
          </CardContent>
        </Card>
      )}

      {cohortsExist && (
        <>
          {/* Selectors */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Metric</label>
                  <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a metric..." />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics?.map((metric) => (
                        <SelectItem key={metric.id} value={metric.id}>
                          {metric.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Month</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {last6Months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Peer Matching Toggle + Confidence Badge */}
          {selectedMetricId && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <PeerMatchingToggle
                enabled={usePeerMatching}
                onChange={setUsePeerMatching}
                disabled={matchedLoading}
              />
              {matchedComparison && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Confidence:</span>
                  <ConfidenceBadge 
                    confidence={matchedComparison.confidence_label}
                    showTooltip={true}
                  />
                  {matchedComparison.confidence_reason && (
                    <span className="text-xs text-muted-foreground hidden md:inline">
                      ({matchedComparison.confidence_reason})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedMetricId && (
            <>
              {/* Interpretation Callout */}
              <InterpretationCallout />
              
              {/* Quality Gate Warning Banner */}
              {(selectedComparison.jane || selectedComparison.nonJane) && (
                <>
                  <QualityGateWarningBanner
                    includedCount={
                      (selectedComparison.jane?.included_count || selectedComparison.jane?.n_orgs || 0) +
                      (selectedComparison.nonJane?.included_count || selectedComparison.nonJane?.n_orgs || 0)
                    }
                    excludedCount={
                      (selectedComparison.jane?.excluded_count || 0) +
                      (selectedComparison.nonJane?.excluded_count || 0)
                    }
                    exclusionReasons={{
                      lowCompleteness:
                        (selectedComparison.jane?.excluded_low_completeness || 0) +
                        (selectedComparison.nonJane?.excluded_low_completeness || 0),
                      highLatency:
                        (selectedComparison.jane?.excluded_high_latency || 0) +
                        (selectedComparison.nonJane?.excluded_high_latency || 0),
                      lowConsistency:
                        (selectedComparison.jane?.excluded_low_consistency || 0) +
                        (selectedComparison.nonJane?.excluded_low_consistency || 0),
                    }}
                  />

                  {/* Per-group quality summaries */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BenchmarkQualitySummary
                      groupLabel="Jane Users"
                      variant="jane"
                      includedCount={selectedComparison.jane?.included_count || selectedComparison.jane?.n_orgs || 0}
                      excludedCount={selectedComparison.jane?.excluded_count || 0}
                      quality={selectedComparison.jane?.quality_summary ? {
                        avgCompleteness: selectedComparison.jane.quality_summary.avg_completeness,
                        avgConsistency: selectedComparison.jane.quality_summary.avg_consistency,
                        avgLatencyDays: selectedComparison.jane.quality_summary.avg_latency_days,
                      } : null}
                    />
                    <BenchmarkQualitySummary
                      groupLabel="Non-Jane Users"
                      variant="non-jane"
                      includedCount={selectedComparison.nonJane?.included_count || selectedComparison.nonJane?.n_orgs || 0}
                      excludedCount={selectedComparison.nonJane?.excluded_count || 0}
                      quality={selectedComparison.nonJane?.quality_summary ? {
                        avgCompleteness: selectedComparison.nonJane.quality_summary.avg_completeness,
                        avgConsistency: selectedComparison.nonJane.quality_summary.avg_consistency,
                        avgLatencyDays: selectedComparison.nonJane.quality_summary.avg_latency_days,
                      } : null}
                    />
                  </div>
                </>
              )}

              {/* Side-by-side Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Selected Month Comparison
                    </div>
                    {matchedComparison?.peer_matching_used && (
                      <Badge variant="outline" className="text-xs">
                        Peer-matched: {matchedComparison.peer_match_criteria?.replace(",", ", ")}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {matchedLoading || janeLoading || nonJaneLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : matchedComparison?.suppressed ? (
                    <div className="text-center py-8">
                      <Badge variant="destructive" className="mb-2">Suppressed</Badge>
                      <p className="text-muted-foreground">{matchedComparison.suppression_reason}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Jane orgs: {matchedComparison.jane_included_count || 0} | 
                        Non-Jane orgs: {matchedComparison.non_jane_included_count || 0}
                      </p>
                    </div>
                  ) : matchedComparison ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cohort</TableHead>
                          <TableHead className="text-center">N Orgs</TableHead>
                          <TableHead className="text-right">P25</TableHead>
                          <TableHead className="text-right">P50 (Median)</TableHead>
                          <TableHead className="text-right">P75</TableHead>
                          <TableHead className="text-right">CV%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            <Badge variant="default" className="bg-green-600">Jane Users</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {matchedComparison.jane_sample_size ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(matchedComparison.jane_p25)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatNumber(matchedComparison.jane_median)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(matchedComparison.jane_p75)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {matchedComparison.jane_coefficient_of_variation != null 
                              ? `${matchedComparison.jane_coefficient_of_variation}%` 
                              : "—"}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <Badge variant="secondary">Non-Jane Users</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {matchedComparison.non_jane_sample_size ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(matchedComparison.non_jane_p25)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatNumber(matchedComparison.non_jane_median)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(matchedComparison.non_jane_p75)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {matchedComparison.non_jane_coefficient_of_variation != null 
                              ? `${matchedComparison.non_jane_coefficient_of_variation}%` 
                              : "—"}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50 font-medium">
                          <TableCell>
                            <span className="text-muted-foreground">Delta %</span>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right">
                            {matchedComparison.delta_percent != null ? (
                              <span className={matchedComparison.delta_percent > 0 ? "text-green-600" : matchedComparison.delta_percent < 0 ? "text-red-600" : ""}>
                                {matchedComparison.delta_percent > 0 ? "+" : ""}{matchedComparison.delta_percent}%
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cohort</TableHead>
                          <TableHead className="text-center">N Orgs</TableHead>
                          <TableHead className="text-right">P25</TableHead>
                          <TableHead className="text-right">P50 (Median)</TableHead>
                          <TableHead className="text-right">P75</TableHead>
                          <TableHead className="text-right">Mean</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            <Badge variant="default" className="bg-green-600">Jane Users</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {selectedComparison.jane?.n_orgs ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(selectedComparison.jane?.p25 ?? null)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatNumber(selectedComparison.jane?.p50 ?? null)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(selectedComparison.jane?.p75 ?? null)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(selectedComparison.jane?.mean ?? null)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <Badge variant="secondary">Non-Jane Users</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {selectedComparison.nonJane?.n_orgs ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(selectedComparison.nonJane?.p25 ?? null)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatNumber(selectedComparison.nonJane?.p50 ?? null)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(selectedComparison.nonJane?.p75 ?? null)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(selectedComparison.nonJane?.mean ?? null)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50 font-medium">
                          <TableCell>
                            <span className="text-muted-foreground">Delta (Jane − Non-Jane)</span>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right">
                            <DeltaIndicator value={selectedComparison.delta.p25} />
                          </TableCell>
                          <TableCell className="text-right">
                            <DeltaIndicator value={selectedComparison.delta.p50} />
                          </TableCell>
                          <TableCell className="text-right">
                            <DeltaIndicator value={selectedComparison.delta.p75} />
                          </TableCell>
                          <TableCell className="text-right">
                            <DeltaIndicator value={selectedComparison.delta.mean} />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* 6-Month Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    6-Month Trend (Median Comparison)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {janeLoading || nonJaneLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-center">Jane N</TableHead>
                          <TableHead className="text-right">Jane P50</TableHead>
                          <TableHead className="text-center">Non-Jane N</TableHead>
                          <TableHead className="text-right">Non-Jane P50</TableHead>
                          <TableHead className="text-right">Delta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trendData.map((row) => (
                          <TableRow
                            key={row.periodStart}
                            className={row.periodStart === selectedMonth ? "bg-primary/10" : ""}
                          >
                            <TableCell className="font-medium">{row.month}</TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {row.janeN || "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(row.janeP50)}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {row.nonJaneN || "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(row.nonJaneP50)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DeltaIndicator value={row.delta} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Privacy Notice */}
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Privacy Note:</strong> This view shows aggregated data only. 
                    No individual organization names or identifiable information is displayed. 
                    Minimum cohort size requirements are enforced at the database level.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
