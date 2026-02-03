/**
 * LinkedIssueCard - Shows linked issue created from failed intervention
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface LinkedIssueCardProps {
  interventionId: string;
}

export function LinkedIssueCard({ interventionId }: LinkedIssueCardProps) {
  const navigate = useNavigate();

  const { data: linkedIssue, isLoading } = useQuery({
    queryKey: ["intervention-linked-issue", interventionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("id, title, status, priority, created_at, owner_id")
        .eq("intervention_id", interventionId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!interventionId,
  });

  if (isLoading || !linkedIssue) {
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
    <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <Badge variant="outline" className="text-orange-700 dark:text-orange-300 border-orange-500/50 text-xs">
                Issue created from failed intervention
              </Badge>
            </div>
            <h4 className="font-medium text-sm truncate">{linkedIssue.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(linkedIssue.status)}
              <span className="text-xs text-muted-foreground">
                Created {format(new Date(linkedIssue.created_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/issues?highlight=${linkedIssue.id}`)}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Issue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
