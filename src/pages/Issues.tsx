import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Issues = () => {
  const { data: issues, isLoading } = useQuery({
    queryKey: ["issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("*, users(full_name), todos(id)")
        .order("priority");
      
      if (error) throw error;
      return data;
    },
  });

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) return { variant: "danger", label: "High" };
    if (priority === 2) return { variant: "warning", label: "Medium" };
    return { variant: "muted", label: "Low" };
  };

  const getStatusLabel = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Issues</h1>
        <p className="text-muted-foreground">Track and resolve operational challenges</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Issues</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading issues...</p>
          ) : issues && issues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Todos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => {
                  const priorityBadge = getPriorityBadge(issue.priority);
                  return (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{issue.title}</p>
                          {issue.context && (
                            <p className="text-xs text-muted-foreground mt-1">{issue.context}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityBadge.variant as "danger" | "warning" | "muted"}>
                          {priorityBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{issue.users?.full_name || "Unassigned"}</TableCell>
                      <TableCell>
                        <Badge variant={issue.status === "solved" ? "success" : "muted"}>
                          {getStatusLabel(issue.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {issue.todos?.length || 0} todos
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={<AlertCircle className="w-12 h-12" />}
              title="No issues"
              description="Great job! There are no issues at the moment."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Issues;
