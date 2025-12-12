import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, AlertTriangle, TrendingDown, AlertCircle, RefreshCw, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateAlertsForOrganization } from "@/lib/alerts/alertGenerator";
import { ConvertToIssueDialog } from "@/components/issues/ConvertToIssueDialog";

interface AlertsPanelProps {
  organizationId: string | undefined;
  currentUserId: string | undefined;
}

const ALERT_ICONS = {
  off_target: AlertTriangle,
  downtrend: TrendingDown,
  missing_data: AlertCircle,
};

const ALERT_COLORS = {
  off_target: "danger",
  downtrend: "warning",
  missing_data: "muted",
} as const;

export const AlertsPanel = ({ organizationId, currentUserId }: AlertsPanelProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["metric-alerts", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("metric_alerts")
        .select("*, metrics(name, owner, organization_id)")
        .eq("organization_id", organizationId)
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (!currentUserId) throw new Error("User not found");

      const { error } = await supabase
        .from("metric_alerts")
        .update({
          resolved_by: currentUserId,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-alerts", organizationId] });
    },
    onError: (error) => {
      toast({
        title: "Error dismissing alert",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Organization not found");
      await generateAlertsForOrganization(organizationId);
      queryClient.invalidateQueries({ queryKey: ["metric-alerts", organizationId] });
    },
    onSuccess: () => {
      toast({
        title: "Alerts refreshed",
        description: "Latest alerts have been generated based on current data.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error refreshing alerts",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="glass p-4">
        <p className="text-sm text-muted-foreground">Loading alerts...</p>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="glass p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-success" />
            <p className="text-sm font-medium">All metrics looking good! 🎉</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <h3 className="font-semibold">Alerts & Coaching Tips</h3>
          <Badge variant="outline" className="text-muted-foreground">{alerts.length}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => regenerateMutation.mutate()}
          disabled={regenerateMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = ALERT_ICONS[alert.alert_type as keyof typeof ALERT_ICONS];
          const color = ALERT_COLORS[alert.alert_type as keyof typeof ALERT_COLORS];

          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50"
            >
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => {
                        setSelectedAlert(alert);
                        setConvertDialogOpen(true);
                      }}
                      title="Create issue from this alert"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      <span className="text-xs">Issue</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => dismissMutation.mutate(alert.id)}
                      disabled={dismissMutation.isPending}
                      title="Dismiss alert"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {alert.tip && (
                  <p className="text-xs text-muted-foreground">
                    💡 {alert.tip}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConvertToIssueDialog
        open={convertDialogOpen}
        onClose={() => {
          setConvertDialogOpen(false);
          setSelectedAlert(null);
        }}
        alert={selectedAlert}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["issues"] });
          queryClient.invalidateQueries({ queryKey: ["metric-alerts", organizationId] });
        }}
      />
    </Card>
  );
};
