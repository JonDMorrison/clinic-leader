import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertCircle } from "lucide-react";

const Issues = () => {
  const issues = [
    {
      id: 1,
      title: "Front desk scheduling conflicts",
      priority: "danger",
      assignee: "Operations Team",
      status: "Open",
    },
    {
      id: 2,
      title: "Supply inventory tracking",
      priority: "warning",
      assignee: "Office Manager",
      status: "In Progress",
    },
    {
      id: 3,
      title: "Patient wait time reduction",
      priority: "warning",
      assignee: "Clinical Team",
      status: "Open",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Issues</h1>
        <p className="text-muted-foreground">Track and resolve operational challenges</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open Issues</CardTitle>
        </CardHeader>
        <CardContent>
          {issues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.title}</TableCell>
                    <TableCell>
                      <Badge variant={issue.priority as "danger" | "warning"}>
                        {issue.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{issue.assignee}</TableCell>
                    <TableCell>{issue.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={<AlertCircle className="w-12 h-12" />}
              title="No issues"
              description="Great job! There are no open issues at the moment."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Issues;
