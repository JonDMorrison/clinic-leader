import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { KpiSparkline } from "@/components/ui/KpiSparkline";

const Scorecard = () => {
  const metrics = [
    { name: "Patient Satisfaction", target: "90%", actual: "87%", status: "warning", trend: [80, 82, 85, 83, 87] },
    { name: "Daily Appointments", target: "50", actual: "52", status: "success", trend: [45, 48, 50, 51, 52] },
    { name: "Revenue per Patient", target: "$200", actual: "$195", status: "warning", trend: [180, 185, 190, 192, 195] },
    { name: "Staff Utilization", target: "85%", actual: "88%", status: "success", trend: [82, 84, 86, 87, 88] },
  ];

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric) => (
                <TableRow key={metric.name}>
                  <TableCell className="font-medium">{metric.name}</TableCell>
                  <TableCell>{metric.target}</TableCell>
                  <TableCell>{metric.actual}</TableCell>
                  <TableCell>
                    <Badge variant={metric.status as "success" | "warning"}>
                      {metric.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <KpiSparkline data={metric.trend} className="h-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Scorecard;
