import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Clock,
  AlertTriangle,
  PartyPopper,
  Plus,
  ExternalLink,
  Zap,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useInterventionMeetingSignals } from "@/hooks/useInterventionMeetingSignals";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { NewInterventionModal } from "@/components/interventions/NewInterventionModal";
import { format } from "date-fns";
import type { InterventionSignal } from "@/lib/interventions/meetingSignals";
import { WhyAmISeeingThisDialog, WhyAmISeeingThisLink } from "@/components/shared/WhyAmISeeingThisDialog";

interface MeetingCommitmentsSectionProps {
  meetingId: string;
  organizationId: string;
}

type CommitmentType = 'create_intervention' | 'review_overdue' | 'followup_metric' | 'other';

interface MeetingCommitment {
  id: string;
  commitment_type: CommitmentType;
  label: string;
  linked_intervention_id: string | null;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
}

export function MeetingCommitmentsSection({ meetingId, organizationId }: MeetingCommitmentsSectionProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNewInterventionModal, setShowNewInterventionModal] = useState(false);
  const [showWhyDialog, setShowWhyDialog] = useState(false);

  // Fetch role data for leadership check
  const { data: roleData } = useIsAdmin();
  const isLeadership = roleData?.isManager ?? false;

  // Fetch intervention signals (only for leadership)
  const { data: interventionSignals, isLoading: signalsLoading } = useInterventionMeetingSignals({
    organizationId,
    enabled: isLeadership,
  });

  // Fetch users for intervention modal
  const { data: users = [] } = useQuery({
    queryKey: ["users", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", organizationId)
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch existing commitments for this meeting
  const { data: commitments, isLoading: commitmentsLoading } = useQuery({
    queryKey: ["meeting-commitments", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_commitments")
        .select("id, commitment_type, label, linked_intervention_id, assigned_to, due_date, created_at")
        .eq("meeting_id", meetingId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as MeetingCommitment[];
    },
    enabled: !!meetingId && !!organizationId,
  });

  // Create commitment mutation
  const createCommitmentMutation = useMutation({
    mutationFn: async ({ 
      type, 
      label, 
      linkedInterventionId 
    }: { 
      type: CommitmentType; 
      label: string; 
      linkedInterventionId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("meeting_commitments")
        .insert({
          organization_id: organizationId,
          meeting_id: meetingId,
          commitment_type: type,
          label,
          linked_intervention_id: linkedInterventionId || null,
          created_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-commitments", meetingId] });
      toast({ title: "Commitment recorded" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record commitment", description: error.message, variant: "destructive" });
    },
  });

  const handleStartNewIntervention = () => {
    createCommitmentMutation.mutate({
      type: 'create_intervention',
      label: 'Create new intervention',
    });
    setShowNewInterventionModal(true);
  };

  const handleReviewOverdue = () => {
    createCommitmentMutation.mutate({
      type: 'review_overdue',
      label: 'Review overdue interventions',
    });
    navigate('/interventions?filter=overdue');
  };

  const handleViewIntervention = (intervention: InterventionSignal) => {
    navigate(`/interventions/${intervention.id}`);
  };

  // Count signals
  const overdueCount = interventionSignals?.overdue_interventions?.length || 0;
  const atRiskCount = interventionSignals?.at_risk_interventions?.length || 0;
  const successCount = interventionSignals?.newly_successful_interventions?.length || 0;
  const totalSignals = overdueCount + atRiskCount + successCount;
  const hasActionableSignals = overdueCount > 0 || atRiskCount > 0;

  const isLoading = signalsLoading || commitmentsLoading;

  // Don't show for non-leadership
  if (!isLeadership) {
    return null;
  }

  const getCommitmentIcon = (type: CommitmentType) => {
    switch (type) {
      case 'create_intervention': return <Zap className="w-3 h-3 text-primary" />;
      case 'review_overdue': return <Clock className="w-3 h-3 text-warning" />;
      case 'followup_metric': return <Target className="w-3 h-3 text-accent-foreground" />;
      default: return <CheckCircle2 className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <>
      <Card className="border-warning/20 bg-warning/5">
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-warning" />
            Commitments
            {totalSignals > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">
                {totalSignals} signal{totalSignals !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading commitments...</p>
          ) : (
            <>
              {/* Intervention Signals */}
              {totalSignals > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    Intervention Signals
                  </h4>
                  
                  {/* Overdue Interventions */}
                  {interventionSignals?.overdue_interventions?.map((intervention) => (
                    <div 
                      key={`overdue-${intervention.id}`} 
                      className="flex items-center justify-between p-2 rounded bg-destructive/10 text-sm border border-destructive/20"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-destructive shrink-0" />
                          <span className="truncate font-medium">{intervention.title}</span>
                          <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground pl-5">
                          {intervention.primaryMetricName && `${intervention.primaryMetricName} · `}
                          {Math.abs(intervention.progress.days_remaining)} days overdue
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => handleViewIntervention(intervention)}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  {/* At Risk Interventions */}
                  {interventionSignals?.at_risk_interventions?.map((intervention) => (
                    <div 
                      key={`at-risk-${intervention.id}`} 
                      className="flex items-center justify-between p-2 rounded bg-warning/10 text-sm border border-warning/20"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
                          <span className="truncate font-medium">{intervention.title}</span>
                          <Badge variant="warning" className="text-xs">At Risk</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground pl-5">
                          {intervention.primaryMetricName && `${intervention.primaryMetricName} · `}
                          {intervention.progress.days_remaining} days remaining
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => handleViewIntervention(intervention)}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  {/* Newly Successful Interventions */}
                  {interventionSignals?.newly_successful_interventions?.map((intervention) => (
                    <div 
                      key={`success-${intervention.id}`} 
                      className="flex items-center justify-between p-2 rounded bg-success/10 text-sm border border-success/20"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <PartyPopper className="w-3 h-3 text-success shrink-0" />
                          <span className="truncate font-medium">{intervention.title}</span>
                          <Badge variant="success" className="text-xs">Success</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground pl-5">
                          {intervention.primaryMetricName && `${intervention.primaryMetricName} · `}
                          {intervention.deltaPercent !== undefined && (
                            <span className="text-success font-medium">
                              +{intervention.deltaPercent.toFixed(1)}% improvement
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => handleViewIntervention(intervention)}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Commitment Prompt */}
              {hasActionableSignals && (
                <div className="p-3 rounded-md bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Do we need to create a new intervention or adjust one?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={handleStartNewIntervention}
                      disabled={createCommitmentMutation.isPending}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Start New Intervention
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReviewOverdue}
                      disabled={createCommitmentMutation.isPending}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Review Overdue ({overdueCount})
                    </Button>
                  </div>
                  <div className="mt-3">
                    <WhyAmISeeingThisLink onClick={() => setShowWhyDialog(true)} />
                  </div>
                </div>
              )}

              {/* No signals state */}
              {totalSignals === 0 && (
                <div className="text-sm text-muted-foreground">
                  <p>No intervention signals this meeting. All interventions are on track.</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-7 px-2"
                    onClick={() => setShowNewInterventionModal(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Start New Intervention Anyway
                  </Button>
                </div>
              )}

              {/* Recent Commitments */}
              {commitments && commitments.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recent Commitments
                  </h4>
                  <div className="space-y-1">
                    {commitments.map((commitment) => (
                      <div
                        key={commitment.id}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        {getCommitmentIcon(commitment.commitment_type)}
                        <span>{commitment.label}</span>
                        <span className="text-muted-foreground/60">
                          · {format(new Date(commitment.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* New Intervention Modal */}
      <NewInterventionModal
        open={showNewInterventionModal}
        onClose={() => setShowNewInterventionModal(false)}
        organizationId={organizationId}
        users={users}
      />

      {/* Why Am I Seeing This Dialog */}
      <WhyAmISeeingThisDialog
        open={showWhyDialog}
        onClose={() => setShowWhyDialog(false)}
        context="meeting-commitment"
      />
    </>
  );
}
