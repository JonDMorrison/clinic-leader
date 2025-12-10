import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface ScorecardSnapshotProps {
  kpis: any[];
}

export const ScorecardSnapshot = ({ kpis }: ScorecardSnapshotProps) => {
  const getStatus = (kpi: any) => {
    const latestReading = kpi.kpi_readings?.[0];
    if (!latestReading || !kpi.target) return "muted";
    
    const value = parseFloat(String(latestReading.value));
    const target = parseFloat(String(kpi.target));
    
    if (kpi.direction === ">=") {
      return value >= target ? "success" : "danger";
    } else if (kpi.direction === "<=") {
      return value <= target ? "success" : "danger";
    } else {
      return value === target ? "success" : "danger";
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === "$") return `$${value.toLocaleString()}`;
    if (unit === "%") return `${value}%`;
    return value.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scorecard Review (5 min)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review each KPI - are we on track?
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {kpis.map((kpi) => {
            const status = getStatus(kpi);
            const latestReading = kpi.kpi_readings?.[0];
            
            return (
              <div
                key={kpi.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {status === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <XCircle className="w-5 h-5 text-danger" />
                  )}
                  <div>
                    <p className="font-medium">{kpi.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Owner: {kpi.users?.full_name || "Unassigned"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-mono font-semibold">
                      {latestReading ? formatValue(parseFloat(String(latestReading.value)), kpi.unit) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Target: {formatValue(parseFloat(String(kpi.target)), kpi.unit)}
                    </p>
                  </div>
                  <Badge variant={status as "success" | "danger" | "muted"}>
                    {status === "success" ? "On Track" : "Off Track"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
