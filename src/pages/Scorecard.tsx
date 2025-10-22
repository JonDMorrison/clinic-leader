import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { KpiSparkline } from "@/components/ui/KpiSparkline";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Scorecard = () => {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ["kpis-detailed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpis")
        .select("*, kpi_readings(value, week_start), users(full_name)")
        .eq("active", true)
        .order("category")
        .order("week_start", { foreignTable: "kpi_readings", ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const formatValue = (value: number, unit: string) => {
    if (unit === "$") return `$${value.toLocaleString()}`;
    if (unit === "%") return `${value}%`;
    if (unit === "count") return value.toString();
    return `${value} ${unit}`;
  };

  const getStatus = (kpi: any) => {
    const latestReading = kpi.kpi_readings?.[0];
    if (!latestReading || !kpi.target) return "muted";
    
    const value = parseFloat(latestReading.value);
    const target = parseFloat(kpi.target);
    
    if (kpi.direction === ">=") {
      return value >= target ? "success" : "warning";
    } else if (kpi.direction === "<=") {
      return value <= target ? "success" : "warning";
    } else {
      return value === target ? "success" : "warning";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Scorecard</h1>
        <p className="text-muted-foreground">Track your key performance indicators</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading metrics...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trend (Last 7 Weeks)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis?.map((kpi) => {
                  const latestReading = kpi.kpi_readings?.[0];
                  const trendData = kpi.kpi_readings?.slice(0, 7).reverse().map((r: any) => parseFloat(r.value)) || [];
                  const status = getStatus(kpi);
                  
                  return (
                    <TableRow key={kpi.id}>
                      <TableCell className="font-medium">{kpi.name}</TableCell>
                      <TableCell>{formatValue(parseFloat(String(kpi.target)), kpi.unit)}</TableCell>
                      <TableCell>{latestReading ? formatValue(parseFloat(String(latestReading.value)), kpi.unit) : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{kpi.users?.full_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={status as "success" | "warning" | "muted"}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <KpiSparkline data={trendData} className="h-8" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Scorecard;
