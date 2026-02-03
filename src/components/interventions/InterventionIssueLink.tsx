/**
 * InterventionIssueLink - Shows linked issue from an intervention detail page
 * Provides bidirectional navigation from Intervention → Issue
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface InterventionIssueLinkProps {
  interventionId: string;
}

export function InterventionIssueLink({ interventionId }: InterventionIssueLinkProps) {
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["intervention-issues", interventionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select(`
          id, title, status, priority, created_at, created_from, solved_at,
          owner:owner_id(id, full_name)
        `)
        .eq("intervention_id", interventionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!interventionId,
  });

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (issues.length === 0) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case "solved":
        return <Badge className="bg-green-500">Solved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4" />
          Related Issues ({issues.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {issues.map((issue) => (
            <Link
              key={issue.id}
              to={`/issues?highlight=${issue.id}`}
              className="block"
            >
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{issue.title}</h4>
                    {getStatusBadge(issue.status)}
                    {issue.created_from === "intervention_outcome" && (
                      <Badge variant="outline" className="text-xs">
                        Auto-created
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {(issue as any).owner?.full_name && (
                      <span>Owner: {(issue as any).owner.full_name}</span>
                    )}
                    <span>Created {format(new Date(issue.created_at), "MMM d, yyyy")}</span>
                    {issue.solved_at && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Solved {format(new Date(issue.solved_at), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
