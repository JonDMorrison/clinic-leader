/**
 * PlaybookApprovalPanel - Admin panel for reviewing and approving playbooks
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookMarked, AlertCircle } from "lucide-react";
import { PlaybookCard } from "./PlaybookCard";
import {
  usePendingPlaybooks,
  useApprovePlaybook,
  useRejectPlaybook,
} from "@/hooks/usePlaybooks";

interface PlaybookApprovalPanelProps {
  className?: string;
}

export function PlaybookApprovalPanel({ className }: PlaybookApprovalPanelProps) {
  const { data: pendingPlaybooks = [], isLoading } = usePendingPlaybooks();
  const approveMutation = useApprovePlaybook();
  const rejectMutation = useRejectPlaybook();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookMarked className="h-4 w-4" />
            Playbook Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingPlaybooks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookMarked className="h-4 w-4" />
            Playbook Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No playbooks pending approval. Playbooks are auto-generated when intervention patterns exceed success thresholds.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookMarked className="h-4 w-4 text-primary" />
            Playbook Approvals
            <Badge variant="secondary" className="text-xs">
              {pendingPlaybooks.length}
            </Badge>
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Review and approve auto-generated playbooks from successful intervention patterns
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingPlaybooks.map((playbook) => (
          <PlaybookCard
            key={playbook.id}
            playbook={playbook}
            onApprove={(id) => approveMutation.mutate(id)}
            onReject={(id, reason) => rejectMutation.mutate({ playbookId: id, reason })}
            isApproving={approveMutation.isPending}
            isRejecting={rejectMutation.isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}
