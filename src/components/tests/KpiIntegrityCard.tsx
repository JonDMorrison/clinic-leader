import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface KpiDetail {
  kpi_id: string;
  kpi_name: string;
  owner: string;
  unit: string;
  direction: string;
  has_target: boolean;
  reading_count: number;
  latest_reading: string | null;
  issues: string[];
}

interface KpiIntegrityResult {
  success: boolean;
  checks: {
    kpi_names_valid: boolean;
    units_consistent: boolean;
    readings_populated: boolean;
    rollups_match: boolean;
    backfill_created: boolean;
    targets_editable: boolean;
  };
  kpi_details: KpiDetail[];
  summary: {
    total_kpis: number;
    valid_kpis: number;
    kpis_with_issues: number;
  };
  timestamp: string;
}

export function KpiIntegrityCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KpiIntegrityResult | null>(null);

  const runIntegrityCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("kpi-integrity");

      if (error) throw error;

      setResult(data);

      const allPassed = Object.values(data.checks).every((v) => v === true);
      if (allPassed && data.summary.kpis_with_issues === 0) {
        toast.success("All KPI integrity checks passed!");
      } else {
        toast.warning("Some KPI integrity checks failed");
      }
    } catch (error: any) {
      console.error("KPI integrity check failed:", error);
      toast.error(`Integrity check failed: ${error.message}`);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getCheckIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle2 className="h-5 w-5 text-success" />
    ) : (
      <XCircle className="h-5 w-5 text-destructive" />
    );
  };

  const getCheckLabel = (key: string) => {
    const labels: Record<string, string> = {
      kpi_names_valid: "KPI Names Valid",
      units_consistent: "Units Consistent",
      readings_populated: "Readings Populated",
      rollups_match: "Rollups Match",
      backfill_created: "12-Week Backfill",
      targets_editable: "Targets Editable",
    };
    return labels[key] || key;
  };

  return (
    <Card className="glass">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">KPI Data Integrity</h2>
              <p className="text-sm text-muted-foreground">
                Verify KPI configuration and data quality
              </p>
            </div>
          </div>
          <Button
            onClick={runIntegrityCheck}
            disabled={loading}
            size="sm"
            className="min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              "Run Integrity Check"
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{result.summary.total_kpis}</div>
                <div className="text-xs text-muted-foreground">Total KPIs</div>
              </div>
              <div className="bg-surface/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-success">
                  {result.summary.valid_kpis}
                </div>
                <div className="text-xs text-muted-foreground">Valid KPIs</div>
              </div>
              <div className="bg-surface/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-destructive">
                  {result.summary.kpis_with_issues}
                </div>
                <div className="text-xs text-muted-foreground">With Issues</div>
              </div>
            </div>

            {/* Checks */}
            <div>
              <h3 className="text-sm font-medium mb-3">System Checks</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(result.checks).map(([key, passed]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 bg-surface/30 rounded-lg p-3"
                  >
                    {getCheckIcon(passed)}
                    <span className="text-sm">{getCheckLabel(key)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Details Table */}
            <div>
              <h3 className="text-sm font-medium mb-3">KPI Details</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KPI Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead className="text-center">Target</TableHead>
                      <TableHead className="text-center">Readings</TableHead>
                      <TableHead>Latest</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.kpi_details.map((kpi) => (
                      <TableRow key={kpi.kpi_id}>
                        <TableCell className="font-medium">{kpi.kpi_name}</TableCell>
                        <TableCell>{kpi.owner}</TableCell>
                        <TableCell>
                          <Badge variant="muted" className="text-xs">
                            {kpi.unit}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              kpi.direction === "higher" ? "success" : "warning"
                            }
                            className="text-xs"
                          >
                            {kpi.direction}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {kpi.has_target ? (
                            <CheckCircle2 className="h-4 w-4 text-success inline" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground inline" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {kpi.reading_count}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {kpi.latest_reading
                            ? new Date(kpi.latest_reading).toLocaleDateString()
                            : "No data"}
                        </TableCell>
                        <TableCell>
                          {kpi.issues.length === 0 ? (
                            <Badge variant="success" className="text-xs">
                              OK
                            </Badge>
                          ) : (
                            <Badge variant="danger" className="text-xs">
                              {kpi.issues.length} issue(s)
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-right">
              Last checked: {new Date(result.timestamp).toLocaleString()}
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Run Integrity Check" to verify KPI data quality</p>
          </div>
        )}
      </div>
    </Card>
  );
}
