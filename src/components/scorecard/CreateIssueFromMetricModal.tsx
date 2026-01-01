import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatMetricValue, type MetricStatus } from "@/lib/scorecard/metricStatus";

interface CreateIssueFromMetricModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  metric: {
    id: string;
    name: string;
    target: number | null;
    direction: string;
    unit: string;
    currentValue: number | null;
    status: MetricStatus;
    ownerName?: string | null;
  };
  periodKey: string;
  periodLabel: string;
  rockId?: string;
  rockTitle?: string;
  consecutiveOffTrack?: number;
}

export function CreateIssueFromMetricModal({
  open,
  onClose,
  organizationId,
  metric,
  periodKey,
  periodLabel,
  rockId,
  rockTitle,
  consecutiveOffTrack = 0,
}: CreateIssueFromMetricModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Prefill title - simple and direct
  const defaultTitle = `${metric.name} is off track`;
  
  // Include owner context if available
  const ownerContext = metric.ownerName ? `Owner: ${metric.ownerName}` : null;
  
  const buildDescription = () => {
    const lines = [];
    
    // Always include period context
    lines.push(`Period: ${periodLabel}`);
    
    // Include owner if available
    if (ownerContext) {
      lines.push(ownerContext);
    }
    
    // Include rock context if provided
    if (rockTitle) {
      lines.push(`Rock: ${rockTitle}`);
    }
    
    lines.push(`Metric: ${metric.name}`);
    
    if (metric.status === 'off_track') {
      lines.push(`Current: ${formatMetricValue(metric.currentValue, metric.unit)}`);
      lines.push(`Target: ${formatMetricValue(metric.target, metric.unit)}`);
      
      if (metric.currentValue !== null && metric.target !== null) {
        const gap = metric.currentValue - metric.target;
        const gapLabel = (metric.direction === 'up' || metric.direction === 'higher_is_better') ? 'Under' : 'Over';
        lines.push(`Gap: ${gapLabel} by ${formatMetricValue(Math.abs(gap), metric.unit)}`);
      }
    }
    
    lines.push('');
    lines.push('What is the root cause, and what will we do in the next 7 days?');
    
    return lines.join('\n');
  };

  const [title, setTitle] = useState(defaultTitle);
  const [context, setContext] = useState(buildDescription);
  const [priority, setPriority] = useState(consecutiveOffTrack >= 3 ? '1' : '2');
  const [ownerId, setOwnerId] = useState('');
  const [meetingHorizon, setMeetingHorizon] = useState<'weekly' | 'quarterly' | 'annual'>('weekly');

  // Fetch users for owner dropdown
  const { data: users } = useQuery({
    queryKey: ['org-users', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('team_id', organizationId)
        .order('full_name');
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createIssueMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .insert({
          organization_id: organizationId,
          title: title.trim(),
          context: context.trim() || null,
          priority: parseInt(priority),
          owner_id: ownerId && ownerId !== "_unassigned" ? ownerId : null,
          status: 'open',
          // Link to rock/metric/period if provided
          rock_id: rockId || null,
          metric_id: metric.id || null,
          period_key: periodKey || null,
          meeting_horizon: meetingHorizon,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['off-track-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['scorecard-metrics'] });
      toast.success('Issue created from off-track metric');
      onClose();
      navigate('/issues');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create issue');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    createIssueMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Create Issue from Metric Gap
          </DialogTitle>
          <DialogDescription>
            Create an issue to track and resolve this metric gap.
          </DialogDescription>
        </DialogHeader>

        {/* Metric Summary */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{metric.name}</p>
              <p className="text-xs text-muted-foreground">{periodLabel}</p>
            </div>
            <Badge variant="destructive" className="text-xs">
              Off Track
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-destructive font-medium">
              Current: {formatMetricValue(metric.currentValue, metric.unit)}
            </span>
            <span className="text-muted-foreground">
              Target: {formatMetricValue(metric.target, metric.unit)}
            </span>
          </div>
        </div>

        {/* Consecutive off-track warning */}
        {consecutiveOffTrack >= 3 && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This metric has been off track for <strong>{consecutiveOffTrack} consecutive periods</strong>. 
              Consider escalating or addressing root cause.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Description</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Additional details about the issue"
              rows={5}
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Critical</SelectItem>
                  <SelectItem value="2">2 - High</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_unassigned">Unassigned</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="horizon">Meeting Horizon</Label>
            <Select value={meetingHorizon} onValueChange={(v) => setMeetingHorizon(v as 'weekly' | 'quarterly' | 'annual')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly (L10)</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When should this issue be discussed?
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createIssueMutation.isPending}>
              {createIssueMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
