import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, AlertTriangle, Clock, CheckCircle2, TrendingUp, Plus, ExternalLink } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  getInterventionProgress,
  getProgressStatusStyle,
  type ProgressStatus,
} from "@/lib/interventions/interventionStatus";
import { INTERVENTION_TYPE_OPTIONS } from "@/lib/interventions/types";
import { QuickInterventionModal } from "@/components/interventions/QuickInterventionModal";

interface InterventionReviewModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  meetingId?: string;
}

export function InterventionReviewModal({ open, onClose, organizationId, meetingId }: InterventionReviewModalProps) {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["intervention-review-modal", organizationId],
    queryFn: async () => {
      // Fetch active/planned interventions
      const { data: interventions, error } = await supabase
        .from("interventions")
        .select("id, title, status, created_at, expected_time_horizon_days, intervention_type, owner_user_id, is_synthetic")
        .eq("organization_id", organizationId)
        .eq("is_synthetic", false)
        .in("status", ["active", "planned"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!interventions?.length) return { interventions: [], outcomes: {} };

      // Fetch owner names
      const ownerIds = [...new Set(interventions.map(i => i.owner_user_id).filter(Boolean))];
      const { data: users } = ownerIds.length > 0
        ? await supabase.from("users").select("id, full_name").in("id", ownerIds)
        : { data: [] };
      const userMap = (users || []).reduce((acc, u) => { acc[u.id] = u.full_name; return acc; }, {} as Record<string, string>);

      // Fetch outcomes for progress computation
      const interventionIds = interventions.map(i => i.id);
      const { data: outcomes } = await supabase
        .from("intervention_outcomes")
        .select("intervention_id, actual_delta_value, actual_delta_percent")
        .in("intervention_id", interventionIds);

      const outcomesByIntervention = (outcomes || []).reduce((acc, o) => {
        if (!acc[o.intervention_id]) acc[o.intervention_id] = [];
        acc[o.intervention_id].push(o);
        return acc;
      }, {} as Record<string, any[]>);

      // Enrich with progress status
      const enriched = interventions.map(intervention => {
        const progress = getInterventionProgress({
          intervention,
          outcomes: outcomesByIntervention[intervention.id] || [],
        });
        const typeLabel = INTERVENTION_TYPE_OPTIONS.find(t => t.value === intervention.intervention_type)?.label || intervention.intervention_type;
        return {
          ...intervention,
          owner_name: intervention.owner_user_id ? userMap[intervention.owner_user_id] : null,
          progress,
          typeLabel,
        };
      });

      // Sort: overdue first, then at_risk, then active, then planned
      const statusOrder: Record<ProgressStatus, number> = {
        overdue: 0, at_risk: 1, active: 2, on_track: 3, planned: 4, completed: 5, abandoned: 6,
      };
      enriched.sort((a, b) => (statusOrder[a.progress.status] ?? 9) - (statusOrder[b.progress.status] ?? 9));

      return { interventions: enriched, outcomes: outcomesByIntervention };
    },
    enabled: open && !!organizationId,
  });

  const interventions = data?.interventions || [];
  const stalledCount = interventions.filter(i => i.progress.status === "overdue" || i.progress.status === "at_risk").length;

  const getProgressIcon = (status: ProgressStatus) => {
    switch (status) {
      case "on_track": return <TrendingUp className="w-4 h-4 text-success" />;
      case "at_risk": return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "overdue": return <Clock className="w-4 h-4 text-destructive" />;
      case "completed": return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />;
      default: return <Zap className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Intervention Check-in
            </DialogTitle>
            <DialogDescription>
              <span className="flex gap-3 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">{interventions.length} active</Badge>
                {stalledCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{stalledCount} need attention</Badge>
                )}
              </span>
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading interventions…</div>
          ) : interventions.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-muted-foreground">No active interventions.</p>
              <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Start an Intervention
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {stalledCount > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    {stalledCount} intervention{stalledCount !== 1 ? "s" : ""} overdue or at risk
                  </span>
                </div>
              )}

              {interventions.map(intervention => {
                const style = getProgressStatusStyle(intervention.progress.status);
                return (
                  <div
                    key={intervention.id}
                    className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => { onClose(); navigate(`/interventions/${intervention.id}`); }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        {getProgressIcon(intervention.progress.status)}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{intervention.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {intervention.owner_name || "Unassigned"} · {intervention.typeLabel}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right text-xs text-muted-foreground">
                          <p>Day {intervention.progress.days_elapsed} / {intervention.expected_time_horizon_days}</p>
                          {intervention.progress.days_remaining > 0 && (
                            <p>{intervention.progress.days_remaining}d left</p>
                          )}
                        </div>
                        <Badge className={`text-xs ${style.className}`}>{style.label}</Badge>
                      </div>
                    </div>
                    {intervention.progress.reason && (intervention.progress.status === "overdue" || intervention.progress.status === "at_risk") && (
                      <p className="text-xs text-muted-foreground mt-1.5 ml-7">{intervention.progress.reason}</p>
                    )}
                  </div>
                );
              })}

              <div className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Intervention
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { onClose(); navigate("/interventions"); }}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <QuickInterventionModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        organizationId={organizationId}
      />
    </>
  );
}
