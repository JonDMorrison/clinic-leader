import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link, AlertTriangle, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import {
  INTERVENTION_TYPE_OPTIONS,
  type InterventionWithDetails,
} from "@/lib/interventions/types";
import {
  getInterventionProgress,
  getProgressStatusStyle,
  type ProgressStatus,
} from "@/lib/interventions/interventionStatus";

interface InterventionsTableProps {
  interventions: InterventionWithDetails[];
  onRowClick: (id: string) => void;
  isLoading?: boolean;
}

export function InterventionsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center p-4 border rounded-lg">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
    </div>
  );
}

function ProgressStatusBadge({ status }: { status: ProgressStatus }) {
  const style = getProgressStatusStyle(status);
  
  const getIcon = () => {
    switch (status) {
      case "on_track":
        return <TrendingUp className="h-3 w-3 mr-1" />;
      case "at_risk":
        return <AlertTriangle className="h-3 w-3 mr-1" />;
      case "overdue":
        return <Clock className="h-3 w-3 mr-1" />;
      case "completed":
        return <CheckCircle2 className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <Badge className={`${style.className} flex items-center`}>
      {getIcon()}
      {style.label}
    </Badge>
  );
}

export function InterventionsTable({
  interventions,
  onRowClick,
  isLoading,
}: InterventionsTableProps) {
  if (isLoading) {
    return <InterventionsTableSkeleton />;
  }

  const getTypeLabel = (type: string) =>
    INTERVENTION_TYPE_OPTIONS.find((t) => t.value === type)?.label || type;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-center">Metrics</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interventions.map((intervention) => {
            const progress = getInterventionProgress({
              intervention: {
                created_at: intervention.created_at,
                expected_time_horizon_days: intervention.expected_time_horizon_days,
                status: intervention.status,
              },
              outcomes: intervention.outcomes || [],
            });

            return (
              <TableRow
                key={intervention.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(intervention.id)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {intervention.title}
                    {intervention.tags && intervention.tags.length > 0 && (
                      <div className="flex gap-1">
                        {intervention.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {intervention.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{intervention.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {getTypeLabel(intervention.intervention_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ProgressStatusBadge status={progress.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {intervention.owner?.full_name || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(intervention.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-center">
                  {intervention.linked_metrics_count !== undefined &&
                  intervention.linked_metrics_count > 0 ? (
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Link className="h-3 w-3" />
                      <span>{intervention.linked_metrics_count}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
