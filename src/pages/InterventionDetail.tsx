import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Calendar,
  Clock,
  User,
  Tag,
  Pencil,
  Trash2,
  Plus,
  Link as LinkIcon,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  STATUS_COLORS,
  INTERVENTION_TYPE_OPTIONS,
  type InterventionRow,
  type ExpectedDirection,
} from "@/lib/interventions/types";
import { EditInterventionModal } from "@/components/interventions/EditInterventionModal";
import { DeleteInterventionDialog } from "@/components/interventions/DeleteInterventionDialog";
import { LinkMetricModal } from "@/components/interventions/LinkMetricModal";
import { LinkedMetricRow } from "@/components/interventions/LinkedMetricRow";

type InterventionWithUsers = InterventionRow & {
  owner: { id: string; full_name: string } | null;
  creator: { id: string; full_name: string } | null;
};

type LinkedMetric = {
  id: string;
  intervention_id: string;
  metric_id: string;
  expected_direction: ExpectedDirection;
  expected_magnitude_percent: number | null;
  baseline_value: number | null;
  baseline_period_start: string | null;
  baseline_period_type: string;
  created_at: string;
  metric: { id: string; name: string } | null;
};

export default function InterventionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: adminData } = useIsAdmin();

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkMetricModalOpen, setLinkMetricModalOpen] = useState(false);

  // Fetch intervention
  const {
    data: intervention,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["intervention", id],
    queryFn: async () => {
      if (!id) throw new Error("No intervention ID");

      const { data, error } = await supabase
        .from("interventions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Fetch owner and creator names
      const userIds = [data.owner_user_id, data.created_by].filter(Boolean) as string[];
      let usersMap = new Map<string, { id: string; full_name: string }>();

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", userIds);

        usersMap = new Map((usersData || []).map((u) => [u.id, u]));
      }

      return {
        ...data,
        owner: data.owner_user_id ? usersMap.get(data.owner_user_id) || null : null,
        creator: data.created_by ? usersMap.get(data.created_by) || null : null,
      } as InterventionWithUsers;
    },
    enabled: !!id,
  });

  // Fetch linked metrics
  const { data: linkedMetrics = [], refetch: refetchMetrics } = useQuery({
    queryKey: ["intervention-metrics", id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from("intervention_metric_links")
        .select("*")
        .eq("intervention_id", id);

      if (error) throw error;

      // Fetch metric names
      const metricIds = (data || []).map((l) => l.metric_id);
      let metricsMap = new Map<string, { id: string; name: string }>();

      if (metricIds.length > 0) {
        const { data: metricsData } = await supabase
          .from("metrics")
          .select("id, name")
          .in("id", metricIds);

        metricsMap = new Map((metricsData || []).map((m) => [m.id, m]));
      }

      return (data || []).map((link) => ({
        ...link,
        metric: metricsMap.get(link.metric_id) || null,
      })) as LinkedMetric[];
    },
    enabled: !!id,
  });

  // Fetch org users for edit modal
  const { data: users = [] } = useQuery({
    queryKey: ["users", intervention?.organization_id],
    queryFn: async () => {
      if (!intervention?.organization_id) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", intervention.organization_id)
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!intervention?.organization_id,
  });

  // Permission checks
  const isAdmin = adminData?.isAdmin || false;
  const isCreator = intervention?.created_by === currentUser?.id;
  const canEdit = isAdmin || isCreator;
  const canDelete = isAdmin;

  const getTypeLabel = (type: string) =>
    INTERVENTION_TYPE_OPTIONS.find((t) => t.value === type)?.label || type;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/interventions")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !intervention) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/interventions")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Intervention</h1>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-4" />
            <p className="text-destructive font-medium mb-2">Failed to load intervention</p>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              {error instanceof Error ? error.message : "Intervention not found"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/interventions")}>
                Back to List
              </Button>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/interventions")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{intervention.title}</h1>
              <Badge className={STATUS_COLORS[intervention.status]}>
                {intervention.status.charAt(0).toUpperCase() + intervention.status.slice(1)}
              </Badge>
            </div>
            <Badge variant="secondary">{getTypeLabel(intervention.intervention_type)}</Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" onClick={() => setEditModalOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}

          {canDelete ? (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled className="text-muted-foreground">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Only admins can delete interventions
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Section 1: Overview Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="font-medium">{intervention.owner?.full_name || "Unassigned"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Time Horizon</p>
                  <p className="font-medium">{intervention.expected_time_horizon_days} days</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {intervention.start_date
                      ? format(new Date(intervention.start_date), "MMM d, yyyy")
                      : "Not set"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {intervention.end_date
                      ? format(new Date(intervention.end_date), "MMM d, yyyy")
                      : "Not set"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Confidence Level</p>
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full ${
                        i < intervention.confidence_level
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                  <span className="ml-2 font-medium">{intervention.confidence_level}/5</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Origin</p>
                <p className="font-medium capitalize">
                  {intervention.origin_type.replace("_", " ")}
                </p>
              </div>
            </div>

            {/* Section 2: Description */}
            {intervention.description && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                <p className="text-foreground whitespace-pre-wrap">{intervention.description}</p>
              </div>
            )}

            {/* Tags */}
            {intervention.tags && intervention.tags.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {intervention.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Created by</p>
              <p className="font-medium">{intervention.creator?.full_name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {format(new Date(intervention.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Updated</p>
              <p className="font-medium">
                {format(new Date(intervention.updated_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">ID</p>
              <p className="font-mono text-xs break-all">{intervention.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Linked Metrics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Linked Metrics ({linkedMetrics.length})</CardTitle>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setLinkMetricModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Link Metric
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {linkedMetrics.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No metrics linked to this intervention yet.
              </p>
              {canEdit && (
                <Button variant="outline" onClick={() => setLinkMetricModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Link your first metric
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {linkedMetrics.map((link) => (
                <LinkedMetricRow
                  key={link.id}
                  linkId={link.id}
                  interventionId={intervention.id}
                  metricName={link.metric?.name || "Unknown metric"}
                  expectedDirection={link.expected_direction}
                  expectedMagnitudePercent={link.expected_magnitude_percent}
                  baselineValue={link.baseline_value}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {editModalOpen && (
        <EditInterventionModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          intervention={intervention}
          users={users}
        />
      )}

      <DeleteInterventionDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        interventionId={intervention.id}
        interventionTitle={intervention.title}
      />

      <LinkMetricModal
        open={linkMetricModalOpen}
        onClose={() => setLinkMetricModalOpen(false)}
        interventionId={intervention.id}
        organizationId={intervention.organization_id}
        existingMetricIds={linkedMetrics.map((l) => l.metric_id)}
      />
    </div>
  );
}
