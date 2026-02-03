import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertCircle, RefreshCw, Calendar, Clock, User, Tag } from "lucide-react";
import { format } from "date-fns";
import {
  STATUS_COLORS,
  INTERVENTION_TYPE_OPTIONS,
  type InterventionRow,
} from "@/lib/interventions/types";

export default function InterventionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

      // Fetch owner and creator names separately
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
      } as InterventionRow & {
        owner: { id: string; full_name: string } | null;
        creator: { id: string; full_name: string } | null;
      };
    },
    enabled: !!id,
  });

  // Fetch linked metrics
  const { data: linkedMetrics = [] } = useQuery({
    queryKey: ["intervention-metrics", id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from("intervention_metric_links")
        .select(`
          *,
          metric:metrics(id, name)
        `)
        .eq("intervention_id", id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const getTypeLabel = (type: string) =>
    INTERVENTION_TYPE_OPTIONS.find((t) => t.value === type)?.label || type;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/interventions")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

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
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {intervention.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-foreground">{intervention.description}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="font-medium">{intervention.owner?.full_name || "Unassigned"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Time Horizon</p>
                  <p className="font-medium">{intervention.expected_time_horizon_days} days</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {intervention.start_date
                      ? format(new Date(intervention.start_date), "MMM d, yyyy")
                      : "Not set"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Confidence Level</p>
                <p className="font-medium">{intervention.confidence_level}/5</p>
              </div>
            </div>

            {intervention.tags && intervention.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Tags</p>
                </div>
                <div className="flex flex-wrap gap-1">
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

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Created by</p>
              <p className="font-medium">{intervention.creator?.full_name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{format(new Date(intervention.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Updated</p>
              <p className="font-medium">{format(new Date(intervention.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Origin</p>
              <p className="font-medium capitalize">{intervention.origin_type.replace("_", " ")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Metrics ({linkedMetrics.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedMetrics.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No metrics linked to this intervention yet.
            </p>
          ) : (
            <div className="space-y-2">
              {linkedMetrics.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <span className="font-medium">
                    {(link.metric as { id: string; name: string })?.name || "Unknown metric"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {link.expected_direction === "up" ? "↑" : link.expected_direction === "down" ? "↓" : "→"}
                      {link.expected_magnitude_percent && ` ${link.expected_magnitude_percent}%`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
