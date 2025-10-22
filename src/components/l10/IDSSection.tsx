import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlertCircle } from "lucide-react";

interface IDSSectionProps {
  issues: any[];
}

export const IDSSection = ({ issues }: IDSSectionProps) => {
  const getPriorityBadge = (priority: number) => {
    if (priority === 1) return { variant: "danger", label: "Critical" };
    if (priority === 2) return { variant: "warning", label: "High" };
    return { variant: "muted", label: "Medium" };
  };

  const openIssues = issues.filter(i => i.status !== "solved");

  return (
    <Card>
      <CardHeader>
        <CardTitle>IDS - Identify, Discuss, Solve (60 min)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Work through the issue list in priority order
        </p>
      </CardHeader>
      <CardContent>
        {openIssues.length > 0 ? (
          <div className="space-y-2">
            {openIssues.map((issue, index) => {
              const priorityBadge = getPriorityBadge(issue.priority);
              
              return (
                <div
                  key={issue.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{issue.title}</p>
                        {issue.context && (
                          <p className="text-sm text-muted-foreground mt-1">{issue.context}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Owner: {issue.users?.full_name || "Unassigned"}
                        </p>
                      </div>
                      <Badge variant={priorityBadge.variant as "danger" | "warning" | "muted"}>
                        {priorityBadge.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No open issues to discuss. Great job team!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
