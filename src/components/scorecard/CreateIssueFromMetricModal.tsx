import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";
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
  };
  periodKey: string;
  periodLabel: string;
  rockId?: string;
  rockTitle?: string;
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
}: CreateIssueFromMetricModalProps) {
  const queryClient = useQueryClient();
  
  // Prefill title and description
  const defaultTitle = `${metric.name} is ${metric.status === 'off_track' ? 'off-track' : metric.status.replace('_', ' ')} for ${periodLabel}`;
  
  const buildDescription = () => {
    const lines = [];
    if (metric.status === 'off_track') {
      lines.push(`Current value: ${formatMetricValue(metric.currentValue, metric.unit)}`);
      lines.push(`Target: ${formatMetricValue(metric.target, metric.unit)}`);
      lines.push(`Direction: ${metric.direction === 'up' ? 'Higher is better' : 'Lower is better'}`);
      
      if (metric.currentValue !== null && metric.target !== null) {
        const gap = metric.currentValue - metric.target;
        const gapLabel = metric.direction === 'up' ? 'Under' : 'Over';
        lines.push(`Gap: ${gapLabel} by ${formatMetricValue(Math.abs(gap), metric.unit)}`);
      }
    } else if (metric.status === 'needs_data') {
      lines.push(`No data recorded for ${periodLabel}`);
    } else if (metric.status === 'needs_target') {
      lines.push(`No target set for this metric`);
      lines.push(`Current value: ${formatMetricValue(metric.currentValue, metric.unit)}`);
    } else if (metric.status === 'needs_owner') {
      lines.push(`No owner assigned to this metric`);
    }
    
    lines.push('');
    lines.push('Suggested next step: Identify root cause and propose a Rock or adjustment.');
    
    if (rockTitle) {
      lines.push('');
      lines.push(`Linked Rock: ${rockTitle}`);
    }
    
    return lines.join('\n');
  };

  const [title, setTitle] = useState(defaultTitle);
  const [context, setContext] = useState(buildDescription);
  const [priority, setPriority] = useState(metric.status === 'off_track' ? '1' : '2');
  const [ownerId, setOwnerId] = useState('');

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
          owner_id: ownerId || null,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['off-track-metrics'] });
      toast.success('Issue created successfully', {
        action: {
          label: 'View Issue',
          onClick: () => window.location.href = `/issues`,
        },
      });
      onClose();
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
            <Badge 
              variant={metric.status === 'off_track' ? 'destructive' : 'outline'}
              className="text-xs"
            >
              {metric.status.replace('_', ' ')}
            </Badge>
          </div>
          {metric.status === 'off_track' && (
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-destructive font-medium">
                Current: {formatMetricValue(metric.currentValue, metric.unit)}
              </span>
              <span className="text-muted-foreground">
                Target: {formatMetricValue(metric.target, metric.unit)}
              </span>
            </div>
          )}
        </div>

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
                  <SelectItem value="">Unassigned</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
