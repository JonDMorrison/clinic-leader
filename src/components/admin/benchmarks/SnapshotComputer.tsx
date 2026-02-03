import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Database, RefreshCw, Calculator } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
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
  period_type: string;
  period_start: string;
  n_orgs: number;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  mean: number | null;
  stddev: number | null;
  computed_at: string;
}

export function SnapshotComputer() {
  const queryClient = useQueryClient();
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedMetricId, setSelectedMetricId] = useState<string>("");
  const [periodType, setPeriodType] = useState<string>("monthly");
  const [periodStart, setPeriodStart] = useState<string>("");

  // Get cohorts list
  const { data: cohorts } = useQuery({
    queryKey: ["benchmark-cohorts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("bench_get_cohorts");
      if (error) throw error;
      return data as Cohort[];
    },
  });

  // Get all metrics (master admin can see all)
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
  });

  // Get existing snapshot if any
  const { data: existingSnapshot, isLoading: snapshotLoading } = useQuery({
    queryKey: ["benchmark-snapshot", selectedCohortId, selectedMetricId, periodType, periodStart],
    queryFn: async () => {
      if (!selectedCohortId || !selectedMetricId || !periodStart) return null;
      const { data, error } = await supabase.rpc("bench_get_snapshot", {
        _cohort_id: selectedCohortId,
        _metric_id: selectedMetricId,
        _period_type: periodType,
        _period_start: periodStart,
      });
      if (error) throw error;
      return data as Snapshot | null;
    },
    enabled: !!selectedCohortId && !!selectedMetricId && !!periodStart,
  });

  const computeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("bench_compute_snapshot", {
        _cohort_id: selectedCohortId,
        _metric_id: selectedMetricId,
        _period_type: periodType,
        _period_start: periodStart,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["benchmark-snapshot", selectedCohortId, selectedMetricId, periodType, periodStart] 
      });
      toast.success("Snapshot computed successfully");
    },
    onError: (err: Error) => {
      toast.error(`Failed to compute snapshot: ${err.message}`);
    },
  });

  const formatNumber = (value: number | null) => {
    if (value === null) return "—";
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const canCompute = selectedCohortId && selectedMetricId && periodStart;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Compute Snapshots
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selection grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cohort</label>
            <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
              <SelectTrigger>
                <SelectValue placeholder="Select cohort..." />
              </SelectTrigger>
              <SelectContent>
                {cohorts?.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Metric</label>
            <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
              <SelectTrigger>
                <SelectValue placeholder="Select metric..." />
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
            <label className="text-sm font-medium">Period Type</label>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Period Start</label>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
        </div>

        {/* Compute button */}
        <Button
          onClick={() => computeMutation.mutate()}
          disabled={!canCompute || computeMutation.isPending}
          className="gap-2"
        >
          {computeMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Computing...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              Compute Snapshot
            </>
          )}
        </Button>

        {/* Results display */}
        {snapshotLoading ? (
          <div className="text-muted-foreground">Loading snapshot...</div>
        ) : existingSnapshot ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Current Snapshot Results</h3>
              <span className="text-sm text-muted-foreground">
                Computed: {format(new Date(existingSnapshot.computed_at), "MMM d, yyyy h:mm a")}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N Orgs</TableHead>
                  <TableHead>P10</TableHead>
                  <TableHead>P25</TableHead>
                  <TableHead>P50 (Median)</TableHead>
                  <TableHead>P75</TableHead>
                  <TableHead>P90</TableHead>
                  <TableHead>Mean</TableHead>
                  <TableHead>Std Dev</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{existingSnapshot.n_orgs}</TableCell>
                  <TableCell>{formatNumber(existingSnapshot.p10)}</TableCell>
                  <TableCell>{formatNumber(existingSnapshot.p25)}</TableCell>
                  <TableCell className="font-medium">{formatNumber(existingSnapshot.p50)}</TableCell>
                  <TableCell>{formatNumber(existingSnapshot.p75)}</TableCell>
                  <TableCell>{formatNumber(existingSnapshot.p90)}</TableCell>
                  <TableCell>{formatNumber(existingSnapshot.mean)}</TableCell>
                  <TableCell>{formatNumber(existingSnapshot.stddev)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : canCompute ? (
          <div className="text-muted-foreground text-center py-8 border rounded-md">
            No snapshot exists for this selection. Click "Compute Snapshot" to generate one.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
